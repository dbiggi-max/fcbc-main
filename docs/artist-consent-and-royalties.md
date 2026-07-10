# Artist Consent & Royalty Tracking

This document outlines how creator consent dictates image generation availability, and how simulated royalties are computed and recorded.

---

## 1. Executive Summary & Status
*   **Current Status**: **Fully Functional**. Consent checking and JPY royalty recording are integrated into the core database actions.
*   **Files Inspected**: `src/app/generate/actions.ts`, `prisma/schema.prisma`.
*   **Target State**: Hook payouts into verified payment processors or blockchain consensus layers.

---

## 2. Real-Time Consent Safeguards
Before starting any generation request, the backend performs a strict database check on the selected artist:
```typescript
const artist = await prisma.artist.findUnique({
  where: { id: artistId },
  include: { licenseRecords: true },
});

if (artist.status !== "active") {
  throw new Error("Style generation is temporarily paused because creator consent is inactive.");
}
```
If an artist revokes consent, their status is set to `paused` or `inactive`, **instantly blocking** all style generation requests referencing their model adapter.

---

## 3. Royalty Ledger Architecture
When a style generation is successfully completed:
*   The system creates a transaction record inside the `RoyaltyEvent` table.
*   **Default Royalty**: `50 JPY` (simulated).
*   **Fields Logged**:
    *   `generationRequestId`: Linkage to the source generation.
    *   `artistId`: Credited creator.
    *   `amountCents`: `50` (or `5000` depending on JPY fractional representation).
    *   `status`: Default is `simulated`.

---

## 4. Governance Audits
Any modification to an artist's profile, licensing terms, or status results in a new `AuditLog` record to maintain a ledger proving compliance.
