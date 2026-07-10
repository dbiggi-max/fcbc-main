# Creator & Administrative Dashboards

This document details the layout, data permissions, and structural blueprints for creator profiles and administrative portals.

---

## 1. Executive Summary & Status
*   **Current Status**: **Admin Portal Fully Functional**. **User/Artist Dashboards Planned**.
*   **Files Inspected**: `src/app/admin/`, `src/components/AdminDailyThemeDashboard.tsx`.
*   **Target State**: Establish unique, authenticated dashboards for artists to manage profiles, toggle licensing options, and view pending balances.

---

## 2. Admin Portal Structure (`/admin/*`)
The admin area serves as the central control console:
*   **Adapters**: Registers and deploys LoRA weights.
*   **Datasets**: Catalogs processed datasets and validates SHA-256 hashes.
*   **Daily Theme**: Oversees daily prompts, manages calibration sliders, and moderates user drawings.
*   **Generations**: Manages manual generated image attachments.
*   **Audit Logs**: Tracks complete platform logs to prove governance.

---

## 3. Future Artist-Specific Dashboard (`/artist/dashboard`)
When implementing artist accounts:
*   **Profile Page**: Allows creators to update their biography, contact info, and portfolio showcases.
*   **Consent Management Control**: Simple check-boxes to revoke or authorize "training" or "commercial style reproduction" on the fly.
*   **Royalty Payout Module**: Live telemetry tracking accumulated simulated JPY, historic payout dates, and ledger entries.

---

## 4. Local Development Behavior
*   Both user and admin features run on a local offline instance. All pages can be fully explored without logging in or providing tokens.
