# Admin Moderation Workflows

This document details the administrative console workflows, daily theme moderation queues, and live similarity calibration dashboards.

---

## 1. Executive Summary & Status
*   **Current Status**: **Fully Functional double-tab administrative console** under `/admin/daily-theme`.
*   **Files Inspected**: `src/app/admin/daily-theme/page.tsx`, `src/components/AdminDailyThemeDashboard.tsx`.
*   **Target State**: Complete end-to-end audit tracking of all manual overrides with user authentication profiles.

---

## 2. Double-Tab Moderation & Settings Console
The administration dashboard is split into two modules:
1.  **Moderation Queue**:
    *   Lists incoming user drawing submissions.
    *   Displays uploaded images, matching theme prompt texts, computed similarity scores, and status flags.
    *   Provides explicit action triggers: **Approve** or **Reject**.
2.  **Global Pipeline Settings**:
    *   Exposes calibrated configuration parameters (`rawMin`, `rawMax`, `acceptThreshold`, `rejectThreshold`).
    *   Renders an interactive, colored **Calibration Scale model** showing decision boundaries in real-time.
    *   Features editable selection parameters for target prompt strategies and base OpenCLIP model names.

---

## 3. Manual Revalidation Mechanics
When an administrator edits global settings, historical submissions retain their computed score flags to preserve state auditing.
To apply new thresholds retroactively:
*   Admins click **Revalidate** on a target row.
*   This triggers the Next.js server action `adminRevalidateSubmission`, re-evaluating the submission against the updated settings in real-time.

---

## 4. Governance Logging
Every approval, manual rejection, calibration change, or retroactive revalidation writes a descriptive entry to the `AuditLog` table. This provides a transparent record to prove platform integrity during high-visibility demonstrations.
