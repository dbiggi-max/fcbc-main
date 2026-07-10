# Google Cloud Setup Guide

This document outlines the steps required to configure Google Cloud Platform (GCP) resources for staging and production deployments of the `creator-style-lab` platform.

---

## 1. Executive Summary & Status
*   **Current Status**: **Planned / Skeleton**. All operations currently execute on a local stateful filesystem and localized database.
*   **Files Inspected**: `prisma/schema.prisma`, `.env.example`, `scripts/audit-env.ts`.
*   **Target State**: Offload manual uploads, datasets, and LoRA adapters to Google Cloud Storage (GCS) and utilize Google Vertex AI APIs for multimodal validation (Gemini).

---

## 2. GCP APIs to Enable
Before deploying, enable the following APIs in the GCP Console:
1.  **Google Cloud Storage API** (`storage.googleapis.com`)
2.  **Vertex AI API** (`aiplatform.googleapis.com`)
3.  **Secret Manager API** (`secretmanager.googleapis.com`)

---

## 3. IAM & Service Account Configuration
Create a dedicated Service Account for the application:
*   **Name**: `creator-style-lab-sa`
*   **Roles to Grant**:
    *   `roles/storage.objectAdmin` (Read, write, and delete GCS objects)
    *   `roles/aiplatform.user` (Execute Vertex AI model requests)
    *   `roles/secretmanager.secretAccessor` (Resolve database passwords and API keys)

---

## 4. Google Cloud Storage (GCS) Bucket Strategy
Create a single global bucket with subfolders to optimize billing and caching:
```
gs://[project-id]-creator-style-lab-assets/
  ├── uploads/          # Temporary theme submissions (under 30-day lifecycle)
  ├── datasets/         # Artist raw & processed training assets
  └── adapters/         # Trained .safetensors files
```
*   **Lifecycle Rules**: Assign an automatic deletion policy of 30 days for objects under the `/uploads/` path that are flagged with a `rejected` status.

---

## 5. Local Development vs. Production Deployment
*   **Local Dev**: Download the service account JSON credential key, place it in a secure local folder (e.g., `.gcp-keys/`), and set `GOOGLE_APPLICATION_CREDENTIALS` in `.env`.
*   **Production (GCP/Vercel)**:
    *   On Google Cloud (GKE / GCE / Cloud Run), the application automatically inherits authorization via **Workload Identity** or the attached Service Account. No local JSON keyfile is needed.
    *   On Vercel, store the service account JSON key content inside a secure environment variable.

---

## 6. Open Questions
*   Should we use regional or multi-regional GCS buckets to minimize latency for global creators?
*   Should we implement Cloud CDN in front of public artist images to decrease egress charges?
