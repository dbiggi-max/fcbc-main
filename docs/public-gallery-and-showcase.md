# Public Gallery & Creative Showcase

This document details the layout, data visibility boundaries, and transparency properties of the public attribution gallery.

---

## 1. Executive Summary & Status
*   **Current Status**: **Fully Functional Public Showcase**.
*   **Files Inspected**: `src/app/gallery/page.tsx`, `prisma/schema.prisma`.
*   **Target State**: Add real-time blockchain-style cryptographic verification linking back to dataset SHA-256 hashes.

---

## 2. Dynamic Showcase Layout
The gallery page displays all generated art, showing rich metadata to the visitor:
*   **Generated Output Preview**: Interactive cards displaying the completed image asset.
*   **Style Attribution**: Clicking an image opens a detailed modal showing the specific artist whose style was utilized.
*   **Simulated License Badge**: Verifies if the artist provided active consent for the render.
*   **Royalty Payout Receipt**: Renders an interactive confirmation (e.g. *"50 JPY simulator royalty credited to the artist"*).

---

## 3. Data Protection and Visibility Rules
To avoid confusing visitors and to protect the integrity of the administrative moderation pipeline:
*   **Hide Raw Metrics**: Public pages never expose raw numerical cosine similarities, z-scores, or background parameters.
*   **User-Friendly Badges**: Instead of showing `similarity_score: 0.1873`, the UI translates this internally to a simple, descriptive status (e.g. `Passed Validation`).
*   **Audit Integrity**: Complete logs remain accessible strictly via the administrative panel (`/admin/audit-logs`), preventing general users from scraping calibration configurations.

---

## 4. Local Development Behavior
*   The gallery loads local public-domain images and mock generations seeded during database initialization. There are no external cloud dependencies or API keys required to load the page.
