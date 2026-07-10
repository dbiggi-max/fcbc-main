# Style Generation & LoRA Inference Pipeline

This document details how generation requests are registered, processed, and tracked in `creator-style-lab`.

---

## 1. Executive Summary & Status
*   **Current Status**: **Fully Functional Mock/Manual Bridge**.
*   **Files Inspected**: `ml/lora_inference/`, `src/app/generate/page.tsx`, `src/app/admin/generations/page.tsx`, `prisma/schema.prisma`.
*   **Target State**: Automate model serving on Vertex AI custom prediction endpoints or run on-demand serverless GPUs.

---

## 2. Dynamic Workflow Breakdown
```
[User Generation Request]
         │
         ▼
[PostgreSQL Record Queued]
         │
         ├──────────────────────────────────┐
         ▼ (Local / Mock Flow)               ▼ (External / Real Flow)
[Simulate Latency & Mock Output]    [Admin Copies Prompt/Parameters]
         │                                  │
         │                                  ▼
         │                          [Inference on Colab/Kaggle]
         │                                  │
         │                                  ▼
         │                          [Admin Paste Path/URL back to Web]
         │                                  │
         ▼                                  ▼
[Simulated Royalty Ledger Entry]  [Real Image Attached to Request]
```

---

## 3. Local Mock Inference Flow
For seamless local demonstration, users select an artist adapter, write their prompt, and click **Generate**.
*   The system creates a `GenerationRequest` with a `queued` status.
*   After a small latency, the system marks the status as `completed`, attaches a mock stylistic image, and registers a simulated JPY payout transaction in `RoyaltyEvent`.

---

## 4. Manual Notebook Bridge (Real Inference)
To allow real inference without expensive persistent GPU costs:
1.  An administrator views the `/admin/generations` page.
2.  They copy the prompt, seed, adapter path, and trigger tokens.
3.  They paste these variables into the **Google Colab / Kaggle LoRA Inference Template** (`ml/lora_inference/lora_inference_template.md`).
4.  They run the cell, copy the output image URL, and paste it back into the generation request on `/admin/generations`.
5.  Saving the form triggers a real database update and a real simulated royalty event.

---

## 5. Future GCP GPU Integration Notes
When we transition to automated real generation:
*   We will package the Stable Diffusion + LoRA loader in a custom Docker container.
*   We will deploy this container to **Vertex AI Prediction Endpoints** or run it on serverless GPUs (e.g., RunPod, Modal, or Google Kubernetes Engine GKE).
*   Next.js will invoke the endpoint asynchronously, responding back via Server-Sent Events (SSE) or WebSockets when inference completes.
