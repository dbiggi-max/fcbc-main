# Daily Theme Rotation & Scheduling

This document details how drawings prompts are scheduled, displayed, and rotated across date boundaries.

---

## 1. Executive Summary & Status
*   **Current Status**: **Manual Seed-based**. Pinned to `themeDate`. There is no automated rotation or scheduled chron task yet.
*   **Files Inspected**: `prisma/seed.ts`, `src/app/daily-theme/page.tsx`, `prisma/schema.prisma`.
*   **Target State**: Completely automated, serverless daily theme rotation.

---

## 2. Rotation & Retrieval Logic
The active theme is retrieved by matching the local date midnight key:
```typescript
const today = new Date();
const activeTheme = await prisma.dailyTheme.findFirst({
  where: {
    themeDate: {
      gte: startOfDay(today),
      lte: endOfDay(today),
    },
    status: "active",
  },
});
```
If no theme is registered for the current calendar date, the page falls back to the most recently created active theme in the database to prevent a broken landing state.

---

## 3. Scheduled Cron Rotation (Production Plan)
In production on Google Cloud or Vercel, we will configure a serverless cron job:
*   **Frequency**: Once every 24 hours at `00:00 UTC` (or `00:00 JST`).
*   **Action**: Triggers a secure POST endpoint `/api/cron/rotate-theme` that:
    1.  Closes submissions for yesterday's challenge (updates status to `completed`).
    2.  Selects a queued challenge from a prepared `DailyThemePool` table and sets its date to today.
    3.  Dispatches push notifications or websocket updates to connected clients.

---

## 4. Local Development Behavior
*   Local development is seeded via `npm run prisma:seed` which inserts a permanent active theme for the current calendar date so that developers can test submissions immediately.

---

## 5. Open Questions
*   How far in advance should admins prepare and schedule daily themes?
*   Should users be able to browse and submit drawings to past challenges, or should submissions be strictly locked once the rotation day ends?
