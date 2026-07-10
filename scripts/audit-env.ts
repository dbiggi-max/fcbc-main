import "dotenv/config";

// Formatting helpers for beautiful terminal logging
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

console.log(bold("\n========================================================"));
console.log(bold("     CREATOR STYLE LAB - ENVIRONMENT CONFIG AUDIT"));
console.log(bold("========================================================\n"));

let hasWarnings = false;

interface EnvCheck {
  key: string;
  category: "Database" | "Theme Validation" | "Google Cloud Storage" | "Google Cloud Vertex AI" | "App General";
  required: boolean;
  purpose: string;
}

const checks: EnvCheck[] = [
  {
    key: "DATABASE_URL",
    category: "Database",
    required: true,
    purpose: "Primary PostgreSQL connection string for Prisma Client.",
  },
  {
    key: "THEME_VALIDATOR_PROVIDER",
    category: "Theme Validation",
    required: true,
    purpose: "Active validation backend ('mock' or 'python').",
  },
  {
    key: "PYTHON_THEME_VALIDATOR_PATH",
    category: "Theme Validation",
    required: true,
    purpose: "Absolute or relative file path to the Python validation script.",
  },
  {
    key: "PYTHON_THEME_VALIDATOR_TIMEOUT_MS",
    category: "Theme Validation",
    required: true,
    purpose: "Maximum allowed execution time for the Python subprocess in milliseconds.",
  },
  {
    key: "GOOGLE_CLOUD_PROJECT",
    category: "Google Cloud Storage",
    required: false,
    purpose: "Google Cloud Project ID for staging/production deployments.",
  },
  {
    key: "GCS_BUCKET_NAME",
    category: "Google Cloud Storage",
    required: false,
    purpose: "Cloud Storage bucket name for persistent image asset storage.",
  },
  {
    key: "GOOGLE_APPLICATION_CREDENTIALS",
    category: "Google Cloud Storage",
    required: false,
    purpose: "Local JSON keyfile path for authorized Google Cloud SDK integration (Local Dev only).",
  },
  {
    key: "VERTEX_AI_REGION",
    category: "Google Cloud Vertex AI",
    required: false,
    purpose: "Google Cloud region for Vertex AI endpoints (e.g., us-central1, asia-northeast1).",
  },
  {
    key: "VERTEX_AI_MODEL_NAME",
    category: "Google Cloud Vertex AI",
    required: false,
    purpose: "Target Gemini or multimodal validation model name (e.g., gemini-1.5-pro).",
  },
];

const categories = Array.from(new Set(checks.map(c => c.category)));

for (const category of categories) {
  console.log(bold(`📁 Category: ${category}`));
  const categoryChecks = checks.filter(c => c.category === category);
  
  for (const check of categoryChecks) {
    const value = process.env[check.key];
    const isPresent = value !== undefined && value.trim() !== "";
    
    if (isPresent) {
      console.log(`  ${green("✓")} ${check.key}: ${cyan("DETECTED")} (Value: ${check.key === "DATABASE_URL" ? "[REDACTED]" : value})`);
    } else {
      if (check.required) {
        console.log(`  ❌ ${check.key}: ${bold(yellow("MISSING (REQUIRED)"))}`);
        console.log(`     └─ Purpose: ${check.purpose}`);
        hasWarnings = true;
      } else {
        console.log(`  ⚠️  ${check.key}: ${yellow("NOT SET (FUTURE/RECOMMENDED FOR GCP)")}`);
        console.log(`     └─ Purpose: ${check.purpose}`);
        hasWarnings = true;
      }
    }
  }
  console.log("");
}

console.log(bold("========================================================"));
console.log(bold("                     AUDIT RESULT"));
console.log(bold("========================================================"));
if (hasWarnings) {
  console.log(`  Status: ${yellow("COMPLETED WITH RECOMMENDATIONS")}`);
  console.log("  Review any missing/recommended GCP variables above before production deployment.\n");
} else {
  console.log(`  Status: ${green("PERFECT - ALL VARIABLES CONFIGURATED CORRECTLY")}\n`);
}
