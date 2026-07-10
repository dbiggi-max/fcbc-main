# Storage & Image Deletion Policy

This document defines the storage constraints, validation rules, and automated deletion guidelines for handling uploaded image assets in `creator-style-lab`.

---

## 1. Executive Summary & Status
*   **Current Status**: **Fully Functional Local Storage helper** inside `src/lib/storage/`.
*   **Files Inspected**: `src/lib/storage/local-storage.ts`, `prisma/schema.prisma`.
*   **Target State**: Automate background cleanup tasks and transition filesystem storage to Google Cloud Storage.

---

## 2. File Upload Constraints
All uploaded files (theme drawings, dataset additions, manually generated results) must pass strict filters:
*   **Allowed MIME Types**:
    *   `image/jpeg`
    *   `image/png`
    *   `image/webp`
*   **Max File Size Limit**: `10 MB`
*   **Validation Mechanics**: Rejects renamed or unknown binaries by inspecting magic bytes/mime configurations instead of trusting filename extensions.

---

## 3. 30-Day Image Retention Policy
To minimize cost and comply with local data minimization practices:
*   **Applicability**: Appears on user drawings that are automatically or manually marked as `rejected`.
*   **Database Tracking**: When a submission status changes to `rejected`, the system calculates and saves a `retentionUntil` datetime:
    ```typescript
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + 30);
    ```
*   **Automated Cleanup (Prod plan)**: A daily serverless cron task queries expired objects (`retentionUntil < now`), deletes their corresponding file blobs from the storage bucket, and flags the database row's `imagePath` to a placeholder (e.g. `[DELETED_AFTER_30_DAYS]`).

---

## 4. Local Development Behavior
*   Local uploads are stored directly in `public/uploads/` on the host machine.
*   To clear test files during local development, developers can safely run the development reset scripts or manually delete files under the `/public/uploads` subdirectory.
