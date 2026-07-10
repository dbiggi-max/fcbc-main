import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { ThemeValidationInput, ThemeValidationResult } from "./types";

/**
 * ============================================================================
 * SECURITY CONSTRAINTS & BEST PRACTICES FOR PRODUCTION DEPLOYMENT
 * ============================================================================
 * 
 * 1. NO SHELL EXECUTION:
 *    Always use child_process.spawn (not exec or spawn with { shell: true }) and 
 *    pass parameters inside an explicit, parsed string array. This completely 
 *    prevents shell inject command hijacking.
 * 
 * 2. NO ARBITRARY COMMAND CONSTRUCTION:
 *    Only construct arguments derived from validated schema models. Never let 
 *    users supply flag keys or run custom executables.
 * 
 * 3. SSRF MITIGATION:
 *    In production, if image URLs are accepted as inputs, restrict or proxy them 
 *    to block Server-Side Request Forgery (SSRF) threats targeting internal 
 *    databases or cloud metadata services (e.g. 169.254.169.254).
 * 
 * 4. WORKER DECOUPLING:
 *    Running a PyTorch GPU model during a synchronous HTTP request lifecycle can 
 *    clog the Node event loop and block incoming network requests. In production, 
 *    move these validation jobs to an asynchronous queuing pipeline (like BullMQ, 
 *    Celery, or AWS SQS) handled by dedicated worker daemons.
 * ============================================================================
 */

export async function validateWithPythonScript(input: ThemeValidationInput, activeSettings: any): Promise<ThemeValidationResult> {
  const { imagePath, themeText, caption } = input;

  // 1. Resolve environment parameters
  const defaultScriptPath = ["ml", "image_theme_validator", "validate_image_theme.py"].join("/");
  const relativeScriptPath = process.env.PYTHON_THEME_VALIDATOR_PATH || defaultScriptPath;
  const timeoutMs = Number(process.env.PYTHON_THEME_VALIDATOR_TIMEOUT_MS) || 30000;

  const scriptPath = path.resolve(process.cwd(), relativeScriptPath);

  // 2. Discover best Python interpreter (prefers the virtual environment if present)
  const venvParts = ["ml", "image_theme_validator", ".venv", "bin", "python3"];
  const winVenvParts = ["ml", "image_theme_validator", ".venv", "Scripts", "python.exe"];
  const venvPythonPath = path.resolve(process.cwd(), ...venvParts);
  const fallbackVenvPythonPathWin = path.resolve(process.cwd(), ...winVenvParts);
  
  let pythonInterpreter = "python3";
  if (fs.existsSync(venvPythonPath)) {
    pythonInterpreter = venvPythonPath;
  } else if (fs.existsSync(fallbackVenvPythonPathWin)) {
    pythonInterpreter = fallbackVenvPythonPathWin;
  }

  const acceptThreshold = activeSettings.acceptThreshold;
  const rejectThreshold = activeSettings.rejectThreshold;

  // 3. Assemble strictly structured, non-shell arguments array
  const args = [
    scriptPath,
    "--image", imagePath,
    "--theme", themeText,
    "--caption", caption || "",
    "--threshold-accept", acceptThreshold.toString(),
    "--threshold-reject", rejectThreshold.toString(),
    "--raw-min", activeSettings.rawMin.toString(),
    "--raw-max", activeSettings.rawMax.toString(),
    "--prompt-strategy", activeSettings.promptStrategy,
    "--provider", activeSettings.provider,
    "--model-name", activeSettings.modelName,
    "--pretrained-name", activeSettings.pretrainedName,
    "--device", process.env.OPENCLIP_DEVICE || ""
  ];

  return new Promise<ThemeValidationResult>((resolve) => {
    let stdoutBuffer = "";
    let stderrBuffer = "";

    // Spawn the child process without shell wrapping (safe argument isolation)
    const child = spawn(pythonInterpreter, args);

    // Track timeout limits
    const timer = setTimeout(() => {
      console.warn(`[Python Bridge] Validation process exceeded timeout threshold of ${timeoutMs}ms. Killing child...`);
      child.kill("SIGKILL");

      resolve(getTimeoutFallbackResult(acceptThreshold));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      console.error("[Python Bridge] Failed to spawn python validator subprocess:", err);
      resolve(getSpawnErrorFallbackResult(err.message, acceptThreshold));
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        console.warn(`[Python Bridge] Subprocess finished with non-zero exit code: ${code}. stderr: ${stderrBuffer}`);
      }

      // 4. Safe parsing and mapping
      try {
        const trimmedStdout = stdoutBuffer.trim();
        if (!trimmedStdout) {
          throw new Error("Stdout stream is completely empty.");
        }

        const parsed = JSON.parse(trimmedStdout);

        // Check if Python script reported an internal model processing error
        if (parsed.error === true || parsed.error === "true") {
          console.warn(`[Python Bridge] Model reported processing error: ${parsed.message}`);
          resolve(getScriptErrorFallbackResult(parsed.message || "Model reported processing error.", acceptThreshold));
          return;
        }

        // Map python CLIP fields cleanly to database-compatible ThemeValidationResult
        const finalScore = Number(parsed.rawScore) !== undefined ? Number(parsed.rawScore) : (Number(parsed.finalScore) || 0.0);
        const displayScore = Number(parsed.displayScore) || 0;
        const status = parsed.status === "needs_review" ? "borderline" : parsed.status; // Map "needs_review" to Next.js schema "borderline"
        const effectiveStatus = parsed.status === "accepted" ? "accepted" : "rejected";

        resolve({
          accepted: parsed.status === "accepted",
          status: status,
          effectiveStatus,
          finalScore,
          displayScore,
          positiveScore: Number(parsed.positiveSimilarity) || finalScore,
          negativeScore: Number(parsed.negativeSimilarity) || 0.0,
          marginScore: Number(parsed.marginScore) || finalScore,
          visionScore: null,
          thresholdUsed: acceptThreshold,
          confidence: parsed.status === "accepted" ? "high" : parsed.status === "needs_review" ? "medium" : "high",
          reason: parsed.explanation || "Validated via OpenCLIP python engine.",
          detectedConcepts: parsed.detectedConcepts || [],
          interpretationType: parsed.interpretationType || "literal",
          validationModelMetadata: {
            openClipModel: parsed.openClipModel || activeSettings.modelName,
            visionProvider: null,
            visionModel: null,
            validatorVersion: activeSettings.provider,
            thresholdsConfigVersion: "custom-settings-v2",
            positivePromptCount: Number(parsed.positivePromptCount) || 1,
            negativePromptCount: Number(parsed.negativePromptCount) || 0,
            scoreWeights: parsed.scoreWeights || { "theme_similarity": 1.0 }
          }
        });

      } catch (parseErr) {
        console.error("[Python Bridge] Failed to parse JSON or map python validator output:", parseErr);
        console.info("[Python Bridge] Raw stdout content was:", stdoutBuffer);
        resolve(getJsonErrorFallbackResult(parseErr instanceof Error ? parseErr.message : "Malformed JSON output", acceptThreshold));
      }
    });
  });
}

/**
 * Fallback generator for timeout exceptions
 */
function getTimeoutFallbackResult(acceptThreshold: number): ThemeValidationResult {
  return {
    accepted: false,
    status: "borderline",
    effectiveStatus: "rejected",
    finalScore: 0.0,
    displayScore: 0,
    positiveScore: 0.0,
    negativeScore: 0.0,
    marginScore: 0.0,
    thresholdUsed: acceptThreshold,
    visionScore: null,
    confidence: "low",
    reason: "Real validator timed out. Submission requires manual review.",
    detectedConcepts: [],
    interpretationType: "unclear",
    validationModelMetadata: {
      openClipModel: "unknown-clip-model",
      visionProvider: null,
      visionModel: null,
      validatorVersion: "fcbc-python-bridge-timeout-v1.0",
      thresholdsConfigVersion: "thresholds-v2.1",
      positivePromptCount: 0,
      negativePromptCount: 0,
      scoreWeights: {}
    }
  };
}

/**
 * Fallback generator for subprocess spawn exceptions (e.g. python not installed)
 */
function getSpawnErrorFallbackResult(message: string, acceptThreshold: number): ThemeValidationResult {
  return {
    accepted: false,
    status: "borderline",
    effectiveStatus: "rejected",
    finalScore: 0.0,
    displayScore: 0,
    positiveScore: 0.0,
    negativeScore: 0.0,
    marginScore: 0.0,
    thresholdUsed: acceptThreshold,
    visionScore: null,
    confidence: "low",
    reason: `Failed to spawn real validator subprocess. Error: ${message}. Submission requires manual review.`,
    detectedConcepts: [],
    interpretationType: "unclear",
    validationModelMetadata: {
      openClipModel: "unknown-clip-model",
      visionProvider: null,
      visionModel: null,
      validatorVersion: "fcbc-python-bridge-spawn-error-v1.0",
      thresholdsConfigVersion: "thresholds-v2.1",
      positivePromptCount: 0,
      negativePromptCount: 0,
      scoreWeights: {}
    }
  };
}

/**
 * Fallback generator for python validator internal code errors
 */
function getScriptErrorFallbackResult(message: string, acceptThreshold: number): ThemeValidationResult {
  return {
    accepted: false,
    status: "borderline",
    effectiveStatus: "rejected",
    finalScore: 0.0,
    displayScore: 0,
    positiveScore: 0.0,
    negativeScore: 0.0,
    marginScore: 0.0,
    thresholdUsed: acceptThreshold,
    visionScore: null,
    confidence: "low",
    reason: `Real validator error: ${message}. Submission requires manual review.`,
    detectedConcepts: [],
    interpretationType: "unclear",
    validationModelMetadata: {
      openClipModel: "unknown-clip-model",
      visionProvider: null,
      visionModel: null,
      validatorVersion: "fcbc-python-bridge-script-error-v1.0",
      thresholdsConfigVersion: "thresholds-v2.1",
      positivePromptCount: 0,
      negativePromptCount: 0,
      scoreWeights: {}
    }
  };
}

/**
 * Fallback generator for malformed output formats
 */
function getJsonErrorFallbackResult(message: string, acceptThreshold: number): ThemeValidationResult {
  return {
    accepted: false,
    status: "borderline",
    effectiveStatus: "rejected",
    finalScore: 0.0,
    displayScore: 0,
    positiveScore: 0.0,
    negativeScore: 0.0,
    marginScore: 0.0,
    thresholdUsed: acceptThreshold,
    visionScore: null,
    confidence: "low",
    reason: `Real validator returned invalid output (${message}). Submission requires manual review.`,
    detectedConcepts: [],
    interpretationType: "unclear",
    validationModelMetadata: {
      openClipModel: "unknown-clip-model",
      visionProvider: null,
      visionModel: null,
      validatorVersion: "fcbc-python-bridge-json-error-v1.0",
      thresholdsConfigVersion: "thresholds-v2.1",
      positivePromptCount: 0,
      negativePromptCount: 0,
      scoreWeights: {}
    }
  };
}
