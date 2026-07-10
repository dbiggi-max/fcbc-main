# Phase 0 Cloud & Repository Readiness Audit

This document establishes the foundational repository and environment configuration audit for the `creator-style-lab` platform, marking the safe baseline before we introduce cloud-based and active-AI services.

---

## 1. Executive Summary
`creator-style-lab` is a modern Next.js prototype designed to pioneer a **consensual, creator-first AI art platform**. Our investigation reveals a solid, highly polished application base featuring Prisma-managed schemas, interactive sliders, localized datasets (Hokusai/Hiroshige), audit logs, settings calibration tools, and transactional simulated royalties. 

The repository is structurally healthy, fully type-safe, and passes all unit assertions. However, before deploying to production (Vercel + Google Cloud Platform), several architecture boundaries, authentication gaps, and state rotation strategies must be formalized.

---

## 2. Current Repo Architecture
The platform is structured as a standard monorepo-like hybrid utilizing a Next.js App Router and Python-based machine learning submodules:
*   **Next.js Frontend & API Gateway (`src/`)**: Employs Server Actions, dynamic routes, and components compiled via Next.js Turbopack.
*   **Database Layer (`prisma/`)**: Manages the PostgreSQL interface and connection pooling.
*   **Python Subprocess Worker (`ml/image_theme_validator/`)**: Runs localized image embeddings comparison using PyTorch, `open_clip`, or `transformers`.
*   **ML Notebook Infrastructure (`ml/lora_training/` and `ml/lora_inference/`)**: Contains manual template guides and checklists for executing external LoRA operations on Colab/Kaggle.
*   **Dataset Pipelines (`data/`)**: Keeps structured raw images, captions, and processed assets separated per artist.

---

## 3. Current Database & Prisma Status
The relational design is extremely mature and captures all granular parameters required for tracking consent-aware pipelines:
*   **Settings Persistence**: A dedicated `ValidationSettings` model stores global similarity variables (`rawMin`, `rawMax`, `acceptThreshold`, etc.) in the database, allowing on-the-fly adjustment.
*   **Image Metadata**: `DatasetImage` tracks SHA-256 hashes, height, width, and licensing linkages to guarantee dataset integrity.
*   **Granular Validation Tracking**: `ThemeSubmission` stores over 25 distinct columns capturing raw similarities, z-scores, Gemini fallback results, and administrative override logs.

---

## 4. Whether PostgreSQL Appears Local-Only or Production-Ready
The schema is conceptually production-ready, featuring proper indexes on search fields (`themeDate`, `effectiveStatus`, `artistId`, etc.) and clear cascade definitions. 

However, the current connection setup defaults to a direct, stateful connection string (`DATABASE_URL`). While acceptable for local Docker/Postgres, deploying on serverless architectures like Vercel requires a **serverless pooler** (such as Prisma Accelerate, Supabase Connection Pooler, or PgBouncer) to prevent database connection exhaustion.

---

## 5. Migration History & Risks
The migration trail inside `prisma/migrations/` is clean and correctly locked:
1.  `20260708085028_init` (establishes baseline)
2.  `20260709015558_add_theme_submission_explanation` (adds AI reasoning storage)
3.  `20260709090000_add_fair_theme_calibration` (persists settings and linear calibration)

**Risks**: Modifying existing models during Phase 1 (e.g., adding user auth relations) must be handled through standard `prisma migrate dev` rather than destructive `db push` to avoid data loss on prototype environments.

---

## 6. Current Environment Variables
The current environment relies heavily on a stateful filesystem and localized execution. The active variables include:
*   `DATABASE_URL`: Primary database connection string.
*   `THEME_VALIDATOR_PROVIDER`: Toggles between `mock` and `python` subprocesses.
*   `PYTHON_THEME_VALIDATOR_PATH` & `PYTHON_THEME_VALIDATOR_TIMEOUT_MS`: Manage the Python worker.

Missing placeholders have been added to `.env.example` to support future Google Cloud Storage (`GCS_BUCKET_NAME`), Vertex AI regions, and administrative passcodes.

---

## 7. Current Storage Behavior
*   **Image Uploads**: Daily theme submissions and dataset uploads save directly to local disk space under `/public/uploads`.
*   **Model Adapters**: Local model `.safetensors` files are referenced as file paths (e.g., `models/adapters/...`).
*   **Postgres Binaries**: Zero binary files (BLOBs/ByteA) are stored in PostgreSQL. The database strictly stores metadata strings pointing to local files.

---

## 8. Current Authentication Status
*   **Status**: **Non-existent**.
*   All user-facing views and administrative control panels are currently open and accessible to any visitor. Adding an authentication layer (e.g. NextAuth.js or Google Identity Platform) is a critical requirement before production staging.

---

## 9. Current Admin Protection Status
*   **Status**: **Simulated / Non-existent**.
*   The admin actions (such as `adminOverrideSubmission`) authenticate locally using simulated cookies or basic checks, but they do not enforce cryptographically secure session boundaries or Google IAM bindings.

---

## 10. Current User/Artist Ownership Protection Status
*   **Status**: **Partially Simulated**.
*   The database records contain a `userId` field to model ownership, but because there is no authentication system, requests do not verify that the person accessing or deleting a resource matches the actual creator of that resource.

---

## 11. Current Daily Theme Implementation Status
*   **Status**: **Active (Manual/Seeded)**.
*   The system schedules a daily drawing theme (e.g., *"A fox under the moonlight"*) pinned to a specific day via `themeDate`. However, there is no automatic background theme rotation job or scheduled cron trigger. Themes are loaded statically from those seeded in PostgreSQL.

---

## 12. Current Validation Implementation Status
*   **Status**: **Fully Functional**.
*   The validation logic supports a dual-engine architecture (deterministic NLP mock fallback vs dynamic python OpenCLIP runner). It features dynamic prompt ensembling (descriptive, metaphorical, hybrid), z-score background calculations, and database-governed linear calibration ($0\%-100\%$).

---

## 13. Current Generation/LoRA Implementation Status
*   **Status**: **External/Mock**.
*   Image generation is mocked inside the Next.js app to simulate a production-style latency and output. Real training and inference run manually on external free-GPU notebooks (Colab/Kaggle), and admins manually upload the real outputs back to the platform via `/admin/generations`.

---

## 14. Current Royalty/Consent/Audit Implementation Status
*   **Status**: **Production-Ready Core**.
*   *   **Royalties**: Transactions credit a simulated 50 JPY per style render to the artist in `RoyaltyLedger`.
*   *   **Consent**: The `Artist.status` field controls active adapter generation, immediately blocking inference if consent is revoked.
*   *   **Audit**: A robust, transaction-safe `AuditLog` table records all governance, consent, settings modification, and manual override events.

---

## 15. Security Risks
1.  **Exposed Admin Endpoints**: Lack of authorization allows unauthorized users to override submission approvals or modify global settings.
2.  **Lack of User Ownership Checks**: Submissions can be registered or modified under arbitary `userId` parameters.
3.  **Local Subprocess Hijacking**: The python runner invokes shell execution. File paths and arguments passed to the subprocess must be strictly validated to prevent command injection.

---

## 16. Cost Risks
1.  **Local Subprocess CPU Spikes**: Running local OpenCLIP embedding extractions on a CPU-only server under heavy load will cause rapid server lag and potential downtime.
2.  **Vertex AI API Fees**: Shifting to Vertex AI multimodal calls (Gemini 1.5) or hosting custom prediction containers on Vertex endpoints incurs per-token and active-node hosting fees.
3.  **Unbounded Cloud Storage Blobs**: Storing raw high-resolution artist images and LoRA `.safetensors` files (typically 140MB+ each) will escalate GCP storage fees if object lifecycle rules are not set.

---

## 17. Google Cloud Readiness Checklist
- [ ] Create GCP Project and billing account.
- [ ] Configure Vertex AI, Cloud Storage, and Secret Manager APIs.
- [ ] Provision a GCS Bucket with public read access for uploads, and standard bucket storage for datasets.
- [ ] Set GCS Lifecycle Rules to automatically clean up non-overridden rejected files after 30 days.
- [ ] Set up a GCP Service Account with `roles/storage.objectAdmin` and `roles/aiplatform.user` permissions.
- [ ] Store GCS bucket names and Vertex AI locations in environment secrets.

---

## 18. Vercel Readiness Checklist
- [ ] Configure the serverless database connection pooler (e.g., Supabase pooler or Prisma Accelerate).
- [ ] Add `DATABASE_URL` pointing to the pooled port in Vercel Project Settings.
- [ ] Inject `THEME_VALIDATOR_PROVIDER="mock"` or connect to a remote server (Vercel serverless functions cannot execute Python CLI subprocesses locally).
- [ ] Configure environment secret variables for GCP Service Account keys.

---

## 19. Recommended Phase 1 Starting Point
Our immediate focus should be **Phase 1: Daily Theme Drawing Validation**:
1.  Verify the dynamic validation calibration with more test scenarios.
2.  Refine the programmatic fallback so that mock evaluations provide accurate data simulations.
3.  Optimize the Python OpenCLIP subprocess arguments validation to block any potential parameter attacks.

---

## 20. Exact Files Changed During This Audit
*   [`package.json`](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/package.json): Added `"audit:env"` script.
*   [`.env.example`](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/.env.example): Expanded with future Google Cloud, Storage, and security placeholders.
*   [`scripts/audit-env.ts`](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/scripts/audit-env.ts): Safe, local environment verification script.
