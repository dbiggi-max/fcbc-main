import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ThemeValidationProvider, ThemeValidationScores } from "./types";

/**
 * Clean MIME helper based on extension.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png"; // fallback
}

/**
 * Simple, zero-dependency helper to fetch Google Cloud Access Token using local Service Account Key.
 */
async function getGcpAccessToken(): Promise<string> {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not defined.");
  }

  const resolvedPath = path.isAbsolute(keyPath)
    ? keyPath
    : path.resolve(process.cwd(), keyPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Google service account credentials file not found at: ${resolvedPath}`);
  }

  const credentials = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  if (credentials.type !== "service_account") {
    throw new Error("Credentials file must be a service_account type.");
  }

  const clientEmail = credentials.client_email;
  const privateKey = credentials.private_key;
  const tokenUri = credentials.token_uri || "https://oauth2.googleapis.com/token";

  // Construct JWT Header & Payload
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  };

  const base64UrlEncode = (obj: any) => {
    return Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  };

  const jwtHeader = base64UrlEncode(header);
  const jwtPayload = base64UrlEncode(payload);
  const signInput = `${jwtHeader}.${jwtPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  const signature = signer.sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${signInput}.${signature}`;

  // Exchange JWT for access token
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GCP OAuth token exchange failed: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/**
 * Production Google Vertex AI / Gemini validation provider.
 */
export class GoogleGeminiThemeValidationProvider implements ThemeValidationProvider {
  private projectId: string;
  private location: string;
  private modelName: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.projectId = (process.env.GOOGLE_CLOUD_PROJECT_ID || "").trim();
    this.location = (process.env.VERTEX_AI_LOCATION || "asia-northeast1").trim();
    this.modelName = (process.env.GEMINI_VALIDATION_MODEL || "gemini-2.5-flash").trim();
    this.maxTokens = parseInt(process.env.GEMINI_VALIDATION_MAX_OUTPUT_TOKENS || "2048", 10);
    this.temperature = parseFloat(process.env.GEMINI_VALIDATION_TEMPERATURE || "0.1");
  }

  async validate(
    imagePath: string,
    themeText: string,
    themeDescription: string | null
  ): Promise<ThemeValidationScores & { rawResponseJson: any; rawResponseId?: string | null }> {
    console.info(`[GoogleGeminiThemeValidationProvider] Starting Vertex AI evaluation for ${imagePath}...`);

    // 1. Resolve absolute file path
    const isAbsolute = path.isAbsolute(imagePath);
    let absolutePath = imagePath;
    if (!isAbsolute) {
      const cleanPath = imagePath.startsWith("/") ? imagePath.substring(1) : imagePath;
      absolutePath = path.join(process.cwd(), "public", cleanPath);
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Drawing file does not exist on disk: ${absolutePath}`);
    }

    // 2. Read and convert image to base64
    const imageBytes = fs.readFileSync(absolutePath);
    const base64Data = imageBytes.toString("base64");
    const mimeType = getMimeType(absolutePath);

    // 3. Obtain authorization token
    let accessToken: string;
    try {
      accessToken = await getGcpAccessToken();
    } catch (authErr) {
      console.error("[GoogleGeminiThemeValidationProvider] Authentication failed:", authErr);
      throw authErr;
    }

    // 4. Construct Vertex AI API REST Endpoint URL
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelName}:generateContent`;

    // 5. Construct Structured Prompt with JSON Schema Enforcement
    const promptText = `
You are a highly thorough administrative judge and drawing validator for our collaborative drawing platform.
You must analyze the attached drawing and evaluate its compliance against the following Daily Theme criteria:

ACTIVE DAILY THEME: "${themeText}"
DESCRIPTION AND RULES: "${themeDescription || "None specified"}"

You must evaluate and return exactly six properties in a valid JSON document according to the requested schema. Here are the scoring criteria:

1. themeMatchScore (Integer 0 to 100):
   How accurately does the drawing depict the specified active daily theme? 
   Consider both the concrete subjects and instructions. If the theme is concrete (e.g. "dragon"), does it show a dragon? If abstract (e.g. "loneliness"), does it capture that vibe?
   Score 0 means completely off-theme, 100 means a perfect, stunning representation.

2. qualityScore (Integer 0 to 100):
   Evaluate the basic drawing technique, composition, proportions, and artistic clarity. 
   Do not judge based on style preference, but look for clean strokes, good canvas usage, and solid presentation.

3. simplicityScore (Integer 0 to 100):
   How sparse, basic, or flat is the image?
   A score of 100 means a completely blank canvas, a single straight line, or a single primitive shape.
   A score of 0 means a complex, highly shaded, multi-element masterpiece.

4. effortScore (Integer 0 to 100):
   An estimate of the time and human effort put into this drawing.
   High effort (70+) includes cross-hatching, complex textures, perspective, or elaborate details.
   Low effort (< 40) is simple stick figures, low-complexity outlines, or rushed scribbles.

5. spamScore (Integer 0 to 100):
   How likely is this image to be completely empty/blank, low-effort spam, abusive content, text-only, or totally unrelated trolling?
   Blank canvases or random scribbles should receive a score > 80.

6. reasoning (String):
   Provide a concise, professional summary explaining the rationale behind these scores.
   IMPORTANT: This reasoning is for internal governance logging and MUST NOT contain raw scores, rejection codes, or be shown to creators.

RULES:
- Be fair but strict. Empty white images, completely blank files, or single-color scribbles must be marked with very high spamScore (>90), high simplicityScore (>95), and extremely low themeMatchScore (<10).
- Act as an objective, model-improving pipeline guard.
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            themeMatchScore: {
              type: "INTEGER",
              description: "Numeric score between 0 and 100 representing compliance with the daily challenge theme.",
            },
            qualityScore: {
              type: "INTEGER",
              description: "Numeric score between 0 and 100 representing artistic quality and clarity.",
            },
            simplicityScore: {
              type: "INTEGER",
              description: "Numeric score between 0 and 100 representing the sparsity/emptiness of the canvas.",
            },
            effortScore: {
              type: "INTEGER",
              description: "Numeric score between 0 and 100 representing complexity, texturing, and details.",
            },
            spamScore: {
              type: "INTEGER",
              description: "Numeric score between 0 and 100 representing spam or abuse likelihood.",
            },
            reasoning: {
              type: "STRING",
              description: "Concise internal reasoning explaining these scores.",
            },
          },
          required: [
            "themeMatchScore",
            "qualityScore",
            "simplicityScore",
            "effortScore",
            "spamScore",
            "reasoning",
          ],
        },
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    };

    // 6. Execute direct REST fetch call to Vertex AI
    const apiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      throw new Error(`Vertex AI API request failed: ${apiRes.status} ${apiRes.statusText} - ${errText}`);
    }

    const payload = await apiRes.json() as any;
    const candidates = payload.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No validation candidates returned by Vertex AI Gemini.");
    }

    const textResponse = candidates[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error("Empty text part inside Gemini response payload.");
    }

    // 7. Parse and validate JSON structure server-side
    const result = JSON.parse(textResponse.trim());
    
    // Validate scores are safe and fall in correct bounds
    const themeMatchScore = Math.max(0, Math.min(100, Number(result.themeMatchScore || 0)));
    const qualityScore = Math.max(0, Math.min(100, Number(result.qualityScore || 0)));
    const simplicityScore = Math.max(0, Math.min(100, Number(result.simplicityScore || 0)));
    const effortScore = Math.max(0, Math.min(100, Number(result.effortScore || 0)));
    const spamScore = Math.max(0, Math.min(100, Number(result.spamScore || 0)));

    return {
      themeMatchScore,
      qualityScore,
      simplicityScore,
      effortScore,
      spamScore,
      rawResponseJson: {
        ...result,
        geminiResponseId: payload.metadata?.id || null,
      },
      rawResponseId: payload.metadata?.id || null,
    };
  }
}
