# Royalty Payout Readiness Roadmap

This document outlines the steps required to transition simulated artist royalties into real-money payout systems.

---

## 1. Executive Summary & Status
*   **Current Status**: **Fully Implemented Simulated Ledger**. No active banking or currency conversions exist.
*   **Files Inspected**: `prisma/schema.prisma`.
*   **Target State**: Integrate global payout standard platforms (such as Stripe Connect or Wise Payouts).

---

## 2. Ledger Schema Structure
The `RoyaltyEvent` table serves as our core immutable ledger:
*   `id`: Uniquely generated database CUID.
*   `amountCents`: Balance representation in currency base fractions (e.g. 50 JPY = 50).
*   `currency`: Denomination code (defaults to `JPY`).
*   `status`: Payout states (`simulated`, `pending_payout`, `paid`, `held_for_review`).

---

## 3. Transitioning to Real Money (Stripe Connect Plan)
To enable real payouts to participating creators:
1.  **Onboarding**: Direct creators to Stripe Connect to securely link their banking routing codes or debit cards.
2.  **Payout Trigger**: Build an administrative button "/admin/royalties/payout" that:
    *   Aggregates all `simulated` or `pending_payout` rows per artist.
    *   Creates a Stripe Transfer request to the artist's Stripe Account.
    *   Updates rows to `paid` status on successful Stripe response.

---

## 4. Legal Compliance and AML Checks
Before issuing any real payouts:
*   Enforce Know Your Customer (KYC) checking on the dashboard.
*   Collect W-8BEN / W-9 tax declaration documents.
*   Log absolute audit metadata for transaction tracing to satisfy anti-money laundering (AML) laws.
