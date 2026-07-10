import fs from "fs";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { GeneratedTheme } from "./types";

// Zod Schema to validate AI theme outputs
const GeneratedThemeSchema = z.object({
  title: z.string().min(3).max(100),
  prompt: z.string().min(5).max(200),
  description: z.string().min(10).max(500),
  rules: z.string().min(10).max(500),
  tags: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
});

// A robust dictionary of pre-defined drawing challenges as safe fallbacks
const fallbackThemes: GeneratedTheme[] = [
  {
    title: "Steaming Coffee Mug",
    prompt: "A steaming hot ceramic coffee mug sitting on a wooden desk",
    description: "Sketch a cozy morning scene featuring a warm mug of coffee or tea with swirling steam trails rising up.",
    rules: "Focus on creating realistic steam effects and capturing the texture of the wooden surface underneath.",
    tags: ["cozy", "morning", "still-life"],
    difficulty: "Beginner",
  },
  {
    title: "Majestic Owl",
    prompt: "An owl perched on a twisted pine branch under a full moon",
    description: "Draw a detailed owl looking directly forward, perched on a pine tree branch with the night sky in the background.",
    rules: "Highlight the feather details, sharp talons, and bright, concentric circle patterns of the owl's eyes.",
    tags: ["nature", "animal", "night"],
    difficulty: "Intermediate",
  },
  {
    title: "Futuristic Cityscape",
    prompt: "A futuristic skyline with towering neon skyscrapers and flying vehicles",
    description: "Let your imagination run wild with a Sci-Fi metropolis filled with towering skyscrapers, holographic ads, and sky lanes.",
    rules: "Utilize strong perspective lines and high-contrast shading to suggest glowing neon lights and glowing flight trails.",
    tags: ["sci-fi", "architecture", "neon"],
    difficulty: "Advanced",
  },
  {
    title: "Stormy Lighthouse",
    prompt: "A stone lighthouse standing tall against crashing sea waves during a storm",
    description: "Capture the raw power of nature with a lighthouse weathering a violent sea storm.",
    rules: "Emphasize the texture of the stone tower and the dynamic, foaming shape of the crashing water waves.",
    tags: ["sea", "storm", "lighthouse"],
    difficulty: "Intermediate",
  },
  {
    title: "Mystical Forest Pathway",
    prompt: "A winding dirt path leading through an ancient forest of glowing mushrooms",
    description: "Draw a magical forest trail illuminated by bioluminescent mushrooms and light rays breaking through the tree canopy.",
    rules: "Incorporate organic curves and depth of field, making background trees appear softer and fainter.",
    tags: ["fantasy", "forest", "magic"],
    difficulty: "Intermediate",
  },
  {
    title: "Vintage Pocket Watch",
    prompt: "An open antique pocket watch showing its intricate internal gears",
    description: "Challenge yourself by sketching a classic mechanical timekeeper displaying its intricate springs and brass wheels.",
    rules: "Requires high precision for circular geometry, Roman numerals, and interlocking gear teeth.",
    tags: ["vintage", "metal", "mechanics"],
    difficulty: "Advanced",
  },
  {
    title: "Playful Kitten",
    prompt: "A fluffy kitten playing with a colorful ball of yarn",
    description: "Sketch an adorable domestic kitten tangled in or batting at a loose ball of knitting wool.",
    rules: "Focus on soft-fur textures and the playful, dynamic posture of the kitten.",
    tags: ["cute", "pet", "animal"],
    difficulty: "Beginner",
  },
  {
    title: "Desert Sunset",
    prompt: "A silhouetted camel caravan walking past giant cacti under a desert sunset",
    description: "Render a quiet desert scene under a blazing evening sky.",
    rules: "Use stark silhouettes against smooth gradients or hatchings to create a beautiful light-contrast effect.",
    tags: ["desert", "sunset", "silhouette"],
    difficulty: "Beginner",
  },
];

/**
 * Native, zero-dependency helper to obtain Google Cloud Access Token using local Service Account Key.
 */
async function getGcpAccessToken(): Promise<string> {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not defined.");
  }

  const resolvedPath = path.isAbsolute(keyPath)
    ? keyPath
    : path.resolve(process.cwd(), keyPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`GCP service account key file not found at: ${resolvedPath}`);
  }

  const credentials = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  if (credentials.type !== "service_account") {
    throw new Error("Credentials must be of type service_account.");
  }

  const clientEmail = credentials.client_email;
  const privateKey = credentials.private_key;
  const tokenUri = credentials.token_uri || "https://oauth2.googleapis.com/token";

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

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`GCP OAuth failed: ${res.statusText}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/**
 * Formulates a creative drawing prompt using Vertex AI / Gemini API,
 * with strict negative constraints to prevent duplicates from the last 90 days.
 */
export async function generateAIFallbackTheme(
  targetDateKey: string,
  recentPrompts: string[]
): Promise<GeneratedTheme & { generatedByModel?: string; generationPrompt?: string }> {
  const provider = (process.env.DAILY_THEME_ROTATION_PROVIDER || "mock").trim().toLowerCase();
  const isEnabled = process.env.ENABLE_AI_DAILY_THEME_FALLBACK === "true";

  if (provider !== "gemini" || !isEnabled) {
    console.info("[AI-Theme-Generator] AI Fallbacks disabled or configured as mock. Loading local fallback.");
    return getRandomFallbackTheme(recentPrompts);
  }

  try {
    const projectId = (process.env.GOOGLE_CLOUD_PROJECT_ID || "").trim();
    const location = (process.env.VERTEX_AI_LOCATION || "asia-northeast1").trim();
    const modelName = (process.env.GEMINI_THEME_MODEL || "gemini-2.5-flash").trim();

    if (!projectId) {
      throw new Error("GOOGLE_CLOUD_PROJECT_ID is not configured.");
    }

    const accessToken = await getGcpAccessToken();
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:generateContent`;

    const systemInstructions = `
You are a highly creative art director and curator for our online sketchpad platform "creator-style-lab".
Your task is to generate exactly ONE high-quality, inspiring, English daily drawing challenge for today: ${targetDateKey}.

GUIDELINES FOR DRAWING THEMES:
- Make it visual, drawable, tangible, and fun (e.g., "A retro record player", "Steaming bowl of ramen", "Majestic dragon head").
- Ensure it is English-only.
- Keep the description and rules engaging, encouraging artistic experimentation (e.g. highlighting shading, perspective, geometric precision, textures, etc.).
- Output must be safe, friendly, and appropriate for general creative drawing communities.

REPEAT AVOIDANCE CRITICAL CONSTRAINT:
Do NOT repeat, duplicate, or heavily resemble any of the following themes which were used recently over the past 90 days:
${recentPrompts.length > 0 ? recentPrompts.map((p) => `- "${p}"`).join("\n") : "- None used yet"}

OUTPUT SCHEMA:
You MUST output exactly ONE valid JSON document matching this structure:
{
  "title": "Short title of the challenge",
  "prompt": "Highly descriptive, visual drawing prompt",
  "description": "Short explanation of the mood and aesthetic theme context",
  "rules": "Specific structural, brush, detail, or shadow constraints",
  "tags": ["tag1", "tag2"],
  "difficulty": "Beginner" | "Intermediate" | "Advanced"
}
`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/body",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: {
          role: "user",
          parts: [{ text: "Generate the today challenge theme JSON object according to your curatorial system parameters." }],
        },
        systemInstruction: {
          parts: [{ text: systemInstructions }],
        },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Vertex AI daily-theme API returned error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as any;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Received empty content generation block from Vertex AI Gemini.");
    }

    const parsed = JSON.parse(text);
    const validated = GeneratedThemeSchema.parse(parsed);

    return {
      ...validated,
      generatedByModel: modelName,
      generationPrompt: systemInstructions,
    };
  } catch (error) {
    console.error("[AI-Theme-Generator] AI generation encountered an anomaly. Falling back to dictionary.", error);
    return {
      ...getRandomFallbackTheme(recentPrompts),
      generatedByModel: "local-safe-fallback-after-error",
    };
  }
}

/**
 * Safely extracts a random, visual theme from our local dictionary that does not duplicate
 * any of the recently utilized themes in recentPrompts.
 */
function getRandomFallbackTheme(recentPrompts: string[]): GeneratedTheme {
  const recentLower = recentPrompts.map((p) => p.toLowerCase());
  
  // Filter out any fallbacks that match recent prompts
  const eligible = fallbackThemes.filter(
    (theme) =>
      !recentLower.includes(theme.title.toLowerCase()) &&
      !recentLower.includes(theme.prompt.toLowerCase())
  );

  const list = eligible.length > 0 ? eligible : fallbackThemes;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}
