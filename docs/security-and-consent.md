# Security and Consent Policy

This document details critical security considerations, active safeguards, and future authorization roadmaps for the platform.

---

## 1. Executive Summary & Status
*   **Current Status**: **Basic Safeguards & Simulated Checks**. No production authentication is active.
*   **Files Inspected**: `src/lib/theme-validation/python-validator.ts`, `prisma/schema.prisma`.
*   **Target State**: Complete end-to-end user ownership verification and OAuth protection.

---

## 2. Command Injection Prevention (Subprocesses)
When triggering the local Python validator, the Next.js backend executes a CLI subprocess. To ensure arbitrary terminal inputs cannot be injected:
*   We use `spawn` or `execFile` with explicit argument arrays instead of a generic string-interpolated shell environment.
*   Any input string passed as a parameter (such as user prompts or custom themes) must be sanitized:
    *   Strip non-alphanumeric or special shell control characters (like `;`, `&`, `|`, `$`, `\`).
    *   Enforce a maximum string length limit of 150 characters.

---

## 3. Future Admin Authorization (RBAC)
Before launching to a staging environment, we must secure the `/admin` routes:
1.  **Authentication Provider**: Integrate standard Auth.js (NextAuth) or Google OAuth.
2.  **Role-Based Access Control (RBAC)**:
    *   Add a `role` field ("admin", "user", "artist") to the database `User` schema.
    *   Enforce route middleware blocking any request to `/admin/*` unless the session user has the `admin` role:
        ```typescript
        if (session.user.role !== "admin") {
          return NextResponse.redirect(new URL("/login", req.url));
        }
        ```

---

## 4. User and Artist Ownership Checks
*   **Theme Submissions**: Users should only be allowed to modify, remove, or retract submissions that are explicitly linked to their verified `userId`.
*   **Artist Profiles**: Creators should have a dedicated login allowing them to toggle consent on/off for their own adapters. No other user can alter another creator's consent records.
