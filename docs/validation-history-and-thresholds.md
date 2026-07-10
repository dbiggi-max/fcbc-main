# Validation History and Threshold Snapshots

This document explains how historical submissions are stored and snapshotted in `creator-style-lab` to maintain auditability.

---

## 1. Executive Summary & Status
*   **Current Status**: **Fully Implemented**. The schema has built-in columns mapping the exact validation parameters active at the time of submission.
*   **Files Inspected**: `prisma/schema.prisma`.
*   **Target State**: Build automatic regression test sweeps against historical snapshots during major model upgrades.

---

## 2. Preventing Historical Regression
When global similarity parameters (`acceptThreshold`, `rawMin`, etc.) are updated inside `ValidationSettings`, historical drawing submission records *must not* suddenly change their status, as this would break the consistency of past user experiences and audit trails.

To guarantee complete audit-log permanence:
*   The system does *not* dynamically resolve status by joining against live settings.
*   Instead, the system **snapshots** the active settings parameters directly into the `ThemeSubmission` table at the moment of evaluation.

---

## 3. Dedicated Snapshot Schema Columns
The `ThemeSubmission` table contains specialized columns for historical snapshotting:
*   `thresholdUsed`: The exact decision boundary applied to this submission.
*   `positiveScore` / `negativeScore`: Granular similarity sub-scores.
*   `validationMetadata`: A JSON metadata block capturing the active CLIP model name, pre-trained weights, prompt strategies, and python script hash at the moment of validation.

---

## 4. Local Development Behavior
*   Any local drawing submission creates a fully snapshotted record. Developers can safely modify local database sliders and observe that historical rows retain their exact designated status until a manual revalidation is explicitly triggered.
