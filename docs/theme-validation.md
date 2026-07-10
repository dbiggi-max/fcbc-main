# Theme Validation Mechanics

This document explains the mathematical and programmatic underpinnings of the image-theme similarity and decision pipeline in `creator-style-lab`.

---

## 1. Executive Summary & Status
*   **Current Status**: **Fully Implemented locally** inside `src/lib/theme-validation/`.
*   **Files Inspected**: `src/lib/theme-validation/mock-validator.ts`, `src/lib/theme-validation/index.ts`, `ml/image_theme_validator/validate_image_theme.py`.
*   **Target State**: Persist dynamic database parameters, allowing the linear calibration thresholds to be tweaked in real-time.

---

## 2. Dynamic Prompt Expansion Strategies
To avoid the brittleness of matching against a single static string, the platform supports multiple prompt-expansion strategies configured under `ValidationSettings.promptStrategy`:
1.  **Standard**: Matches directly against the seed positive prompts.
2.  **Descriptive**: Appends detailed stylistic adjectives (e.g., "a raw hand-drawn pencil sketch of...", "a high-contrast graphic ink drawing of...").
3.  **Metaphorical**: Generates abstract/conceptual interpretations to allow artistic liberties.
4.  **Hybrid**: Ensembles standard, descriptive, and metaphorical prompts, computing the average cosine similarity.

---

## 3. Cosine Similarity Calibration Formula
Raw cosine embeddings typically range from `0.10` to `0.40`. This is highly confusing to non-technical administrators. The system maps raw scores to a clean, user-friendly $0\% - 100\%$ linear range:

Given:
*   $s_{\text{raw}}$ = Raw cosine similarity score.
*   $s_{\text{min}}$ = `ValidationSettings.rawMin` (Score mapping to 0%).
*   $s_{\text{max}}$ = `ValidationSettings.rawMax` (Score mapping to 100%).

The Calibrated Score ($S_{\text{calibrated}}$) is:

\[
S_{\text{calibrated}} = \max\left(0, \min\left(100, \frac{s_{\text{raw}} - s_{\text{min}}}{s_{\text{max}} - s_{\text{min}}} \times 100\right)\right)
\]

---

## 4. Decision Boundaries
Once calibrated, the system assigns one of three statuses based on configured settings:
*   **Accepted**: $S_{\text{calibrated}} \ge \text{acceptThreshold}$
*   **Rejected**: $S_{\text{calibrated}} < \text{rejectThreshold}$
*   **Borderline**: $\text{rejectThreshold} \le S_{\text{calibrated}} < \text{acceptThreshold}$

*Note: If `acceptThreshold` equals `rejectThreshold`, decisions become strictly binary, eliminating the "Borderline" state.*

---

## 5. Rollback Notes
If calibration edits cause too many false rejections, administrators can click "Reset Defaults" inside `/admin/daily-theme` to restore safe baseline settings:
*   `rawMin` = `0.15`
*   `rawMax` = `0.35`
*   `acceptThreshold` = `0.45`
*   `rejectThreshold` = `0.45`
