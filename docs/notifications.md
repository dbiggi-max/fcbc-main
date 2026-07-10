# Notification Architecture Blueprint

This document details the system design for transmitting automated alerts, emails, and platform-specific messages to creators and administrators.

---

## 1. Executive Summary & Status
*   **Current Status**: **Non-existent / Planned**.
*   **Files Inspected**: `prisma/schema.prisma`.
*   **Target State**: Configure serverless email/SMS notification triggers (using SendGrid, Mailgun, or Twilio) alongside an in-app message center.

---

## 2. Notification Triggers
The platform will dispatch automated notifications on specific state events:
1.  **Submission Approved**: Users receive an alert when their Daily Theme drawing passes OpenCLIP validation and is saved.
2.  **Dataset Ingestion**: Notification informing a creator that an approved drawing has been ingested into their style's training queue.
3.  **Royalty Credited**: Real-time push alert or summary email when a style-isolated render occurs, confirming royalty accrual.
4.  **Consent Paused**: Warning dispatch to administrators if a major creator revokes their model licensing status.

---

## 3. Recommended Tech Stack
*   **Transactional Emails**: Use **Resend** or **Google Cloud SES** for immediate, styled email delivery.
*   **In-App Alerts**: Integrate lightweight React hooks connecting to **Pusher** or **WebSockets** for live, in-browser toasts.

---

## 4. Local Development Behavior
*   During local development, the notification dispatcher logs the payload to the server terminal console (`console.log`) instead of making external API calls, allowing offline testing with zero costs.
