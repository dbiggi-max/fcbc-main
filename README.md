# creator-style-lab

This is a Next.js App Router prototype for exploring future artist style selection, image generation, and simulated royalty event tracking.

## Current Routes

- `/` - Prototype overview
- `/generate` - Future image generation workflow placeholder
- `/gallery` - Future generated image gallery placeholder
- `/daily-theme` - Future daily creative prompt placeholder
- `/admin` - Admin overview placeholder
- `/admin/artists` - Future artist management placeholder
- `/admin/datasets` - Future dataset management placeholder
- `/admin/adapters` - Future model adapter management placeholder
- `/admin/generations` - Future generation review placeholder
- `/admin/royalties` - Future royalty event tracking placeholder

The database schema is defined with Prisma, and seed data is available for museum prototype records. Authentication, image generation, and royalty execution logic are not implemented yet.
The UI uses Tailwind CSS and system fonts only, with no external visual assets.

## Getting Started

Install dependencies, then run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

This prototype is configured for PostgreSQL with Prisma.

Create a local `.env` file from `.env.example` and replace the placeholder connection string:

```bash
cp .env.example .env
```

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Generate Prisma Client after installing dependencies or changing the schema:

```bash
npm run prisma:generate
```

Run the first migration once your PostgreSQL database is available:

```bash
npm run prisma:migrate -- --name init
```

Open Prisma Studio to inspect records:

```bash
npm run prisma:studio
```

Seed data is available for museum prototype records once the database has been migrated.

## Seed Data

After running migrations, seed the museum prototype records:

```bash
npx prisma db seed
```

The seed creates or updates:

- Two `Artist` records: Katsushika Hokusai (`hokusai`) and Utagawa Hiroshige (`hiroshige`)
- One `ConsentOrLicenseRecord` per artist
- One draft `DatasetVersion` per artist
- One placeholder `ModelAdapter` per artist
- One active `DailyTheme` for today: `A fox under the moonlight`

These are historical museum/public-domain prototype styles for internal demo use only. The placeholder source URLs must be replaced with real verified museum/open-access source records before using actual images. A real commercial launch requires verified rights, creator consent where applicable, and legal review.

## Step 4: Read-Only Admin Views (Prisma Integration)

We have fully replaced the static placeholder pages in the admin section with real, high-performance read-only dashboard views. These are built as Next.js React Server Components that query PostgreSQL directly using Prisma.

The active admin routes include:
- `/admin` (Dashboard): Summarizes telemetry counts (Artists, Consent records, Datasets, Deployed adapters, Generations, Simulated royalties, etc.) and lists recent artists and adapters.
- `/admin/artists`: Displays all onboarded artist profiles, slugs, style classification, relation counts, and registration dates with an administrative warning banner.
- `/admin/datasets`: Shows distinct dataset versions, storage paths, image counts, and a table for dataset images (displaying a styled empty state since no dataset images are registered yet).
- `/admin/adapters`: Shows registered style adapters (LoRAs), their target baseline models (e.g., Stable Diffusion 1.5), active trigger tokens, and storage paths.

All pages include robust local try-catch error boundaries around Prisma queries to prevent runtime crashes and report connection issues gracefully.

## Step 5: Manual Dataset Image Registration

We have implemented an interactive, manual dataset image registration flow within the Admin portal. This allows administrators to catalog high-resolution images, assign provenance, edit captions, and log audit trails before initiating LoRA fine-tuning.

### Dynamic Registration Form
Accessible directly at **`/admin/datasets`**, the registration panel features:
- **Cascading Selections**: Selecting an artist automatically filters available dataset versions and license records to prevent mismatched associations.
- **Path Auto-Population**: Storage paths are generated interactively as you type the filename, suggesting structure matching our guidelines.
- **Extensive Metadata**: Fields for filename, local storage path, source URL, dimensions, caption, SHA-256 integrity hash, and quality status.

### Image Storage Philosophy
To maintain excellent, high-performance PostgreSQL operations, **raw image binary blobs are never stored in the database**. Instead, the platform catalogs file paths/URLs and essential verification metadata. The physical image files remain in local or cloud object storage.

### Recommended Folder Structure
For consistency and robust LoRA training, we recommend organizing assets locally using this convention:
```text
data/artists/
├── hokusai/
│   └── v1/
│       ├── raw/          # Approved high-res woodblock prints
│       └── captions/     # text captions matching filenames
└── hiroshige/
    └── v1/
        ├── raw/          # Approved high-res woodblock prints
        └── captions/     # text captions matching filenames
```

### Safety & Compliance Reminder
Always use authorized, public-domain, open-access, or company-owned data. For museum prototype styles, verify the open-access status and replace placeholder source URLs with verified institution records before starting training.

## Step 6: Drag-and-Drop Batch Image Upload

We have integrated a state-of-the-art drag-and-drop training image uploader inside the Admin portal on **`/admin/datasets`**. This uploader allows administrators to queue multiple local style files, specify an optional shared caption prefix, and execute batch uploads in a single transaction.

### Features

- **Cascading Dropdowns**: Automatically filters dataset versions and license records based on the selected artist.
- **Drag-and-Drop Area**: A highly reactive, stateful drag-over region for uploading files (.jpg, .jpeg, .png, .webp only). Includes a file queue list with individual remove options.
- **Shared Caption Prefix**: An optional text field that prefixes captions of all images in the uploaded batch.
- **Advanced manual registration**: The original form has been wrapped in a stateful collapsible accordion to maintain backward compatibility while preserving interface cleanliness.

### Physical Image Storage & Metadata Extraction

- **Local Filesystem Storage**: Files are saved to the local directory under `/public/uploads/datasets/{artistSlug}/{datasetVersionId}/raw/` and served statically by Next.js.
- **Sanitization & Collision Handling**: File names are sanitized for safety. Name collisions are automatically resolved by appending a unique counter suffix (e.g., `_1`, `_2`).
- **Automated Metadata Extraction**: Calculates SHA-256 integrity hashes on the server and extracts image pixel dimensions (`width` and `height`) using `image-size`.
- **Pending Review Pipeline**: Newly uploaded images are registered with the status `uploaded_pending_review`.
- **Visual Image Preview**: The Dataset Images table now displays real local image preview thumbnails for uploaded files using static routes, while providing custom placeholder icons for manually registered remote storage paths.

## Step 7: Manual Model Adapter Registration

We have implemented administrative model adapter (LoRA) registration and management capabilities at **`/admin/adapters`**. This prepares the platform to dynamically steer image generation workflows per-artist, link training telemetry to specific datasets, and enforce legal and billing attribution.

### Understanding Model Adapters

A **Model Adapter** is a set of dynamic weight updates (commonly a LoRA `.safetensors` file) that can be loaded on-the-fly and mounted on top of frozen base models (like *Stable Diffusion 1.5*, *SDXL*, or *FLUX.1 Dev*). By keeping base weights locked and hot-swapping lightweight adapters, the platform avoids hosting heavy, independent models for every artist style.

### Dynamic 1:1 Artist Isolation

The prototype enforces a **1:1 adapter-to-artist isolation** design pattern. This architecture yields critical advantages:
- **Style Isolation**: Style weights are independent. We can enable, pause, or decommission any artist style instantly without rebuilding other models.
- **Attribution Telemetry**: The inference engine can track exactly which adapter was loaded for each user request.
- **Royalty Tracking**: Real-time adapter loading events are dispatched to our simulated royalty engine to credit appropriate artist accounts automatically.

### Registering an Adapter

To register a new adapter configuration:
1. Open **`/admin/adapters`**.
2. Select an onboarded **Artist Style**. The system will automatically suggest a professional **Adapter Name**, **Storage Path**, and **Trigger Token** based on the artist's unique name and slug.
3. Select an optional **Dataset Version** to trace the adapter back to its training origin.
4. Customize the **Base Model**, **Adapter Type** (such as *LoRA*, *Textual Inversion*, *LyCORIS*), and **Deployment Status** (from `placeholder_registered` to `ready`).
5. (Optional) Provide a **Training Notebook URL** (e.g. Google Colab or Kaggle) to keep an audit trail of your training hyperparameters and logs.
6. Click **Register Adapter Metadata**.

### Weight Generation vs. Metadata Registration

> [!IMPORTANT]
> **Adapter registration represents a configuration manifest**. Registering a model adapter does not initiate live GPU-backed training. Real `.safetensors` model weight files are compiled externally on training clusters (using Colab or Kaggle) and stored on designated platform storage volumes, which are then referenced by the file paths in this registry.

## Step 8: Image Generation & Simulated Royalty System

We have completed the implementation of the core creative loop and billing ledger system on **`/generate`**, fully integrated with active database models and logging structures.

### The Complete Platform Loop

The generator demonstrates the full end-to-end transaction pipeline of the platform:
1. **Style Selection**: A developer or user selects a participating artist's style (filtered automatically for styles with active adapters).
2. **Adapter Layering**: Selecting an artist loads their registered weight metadata, including base models, version histories, and style trigger keywords.
3. **Queueing Request**: Submitting the generation form creates a `GenerationRequest` record in PostgreSQL with the initial status `queued` and logs a `generation_requested` audit event.
4. **Processing Inference**: The request is routed to the inference connector, introducing a simulated network/hardware rendering latency of 1.5 seconds.
5. **Inference Completion**: Upon successful render, the system updates the `GenerationRequest` status to `completed`, records the generated image file path, saves the final randomized seed, and logs a `generation_completed` audit event.
6. **Royalty Distribution**: Inside a secure database **transaction**, a `RoyaltyEvent` ledger entry is issued to credit the artist with a simulated royalty fee of **¥50 JPY** and logs a `royalty_event_created` audit event.

### Decoupled Inference Architecture

To allow seamless upgrades in the future, the rendering engine is fully decoupled:
- **Typings (`src/lib/inference/types.ts`)**: Defines generic, decoupled interfaces `GenerateImageInput` and `GenerateImageResult` for input hyperparameters and output metadata.
- **Mock Connector (`src/lib/inference/mock-inference.ts`)**: Implements the mock generation delay and returns a high-resolution Japanese woodblock render (`/placeholder-generated-image.png`).

> [!TIP]
> **Connecting Live GPU Inference**: To replace this mock connector with live Stable Diffusion, SDXL, or FLUX.1 models, you only need to swap the `generateImage` implementation with a fetch request directing to your ComfyUI, RunPod, or Replicate server API, returning the compiled S3/Cloud Storage link. No database schema or frontend changes are required!

### Administrative Monitoring Ledgers

The platform features real-time, query-optimized tracking dashboards:
- **Generation Requests (`/admin/generations`)**: Tracks all executed render jobs. Includes dynamic hoverable image thumbnails, active trigger keyword tags, seed logs, and interactive error-reporting boxes for failed jobs.
- **Royalty Ledger (`/admin/royalties`)**: Aggregates all simulated royalties. Displays standard summaries (Total events, Total JPY payments, Active styles) and includes a side-by-side leaderboard ranking artist engagement and credits.

## Step 9: Interactive Generated Image Gallery & Platform Flow Showcase

We have built a state-of-the-art landing page and interactive, query-optimized **Generated Image Gallery** at **`/gallery`** demonstrating deep style attribution.

### Interactive Gallery Showroom (`/gallery`)

The gallery page offers a visual environment for developers and creators:
1.  **Boss-Demo Explanation Banner**: Highlights style-isolation and JPY payment event calculations.
2.  **Cascading Filter Controls**: Real-time filters allowing users to isolate renders by specific onboarded **Artist Styles** and execution pipeline status (`Completed`, `Queued`, `Failed`).
3.  **Aesthetic Render Cards**: Responsive grid layouts featuring:
    *   **Interactive hover prompt reveals**.
    *   **Strict creator & adapter attribution tags**.
    *   **Interactive JPY royalty credit tags** showing the transaction details.
    *   **SVG Fallbacks**: In case of dynamic file load errors, an animated wireframe SVG placeholder replaces the src to keep pages visually clean.
4.  **Deep-Inspect Modal**: Clicking any card pops open a rich dark overlay disclosing raw, un-truncated database keys: Request ID, Artist ID, Adapter ID, Dataset Version ID, seed tracking, CFG parameters JSON, and simulated Royalty Event ID.

### The Four-Step "Prototype Flow" Map (`/`)

The platform's root index page **`/`** has been redesigned into a sleek landing dashboard tracing the creative and legal lifecycle of style-isolated generative applications:
1.  **Onboard Style**: Establish creator profiles and licensing consent scopes (`/admin/artists`).
2.  **Dataset & Adapter Pairing**: Organize high-quality raw datasets, hash metadata, and register trained LoRA `.safetensors` files (`/admin/datasets` & `/admin/adapters`).
3.  **Generate Image**: Trigger simulated GPU inference using dedicated hot-swappable weights (`/generate`).
4.  **Log Attribution & Royalty**: Calculate and record real-time ¥50 JPY artist compensation, linking each visual output to its original dataset version (`/gallery` & `/admin/royalties`).

### Administrative Telemetry Widget (`/admin`)

We have extended the central Overview page at **`/admin`** to append a full-width **"Recent Completed Generations"** list. Administrators can now monitor mini-render previews, credited creator names, generation prompts, and simulated payment event status badges at a single glance.

## Step 10: Daily Theme & Candidate Data Ingestion

We have fully implemented the **Daily Theme** challenge, candidate asset submission form, administrative review queues, and system audit logs.

### Feature Mechanics (`/daily-theme`)
The Daily Drawing Challenge encourages creators to submit custom artwork matching today's active prompt.
1.  **Dynamic Theme Scheduling**: Next.js queries Prisma for today's active `DailyTheme` record. If no theme is scheduled, a professional empty-state panel instructs developers to seed database prompts.
2.  **Interactive Form Ingestion**: Users can register local file paths or remote public URLs, add descriptive captions, input a prototype User ID, and optionally associate the submission with an onboarded Artist style.
3.  **Explaining Collection Policies**: Clear notices explain how candidate uploads are registered as `pending` training inputs to maintain strict quality and licensing alignment.
4.  **Recent Activity Feed**: The page lists submissions submitted for today's theme, featuring colored Status Badges representing validation states: `pending` (amber), `accepted` (emerald), `needs_review` (indigo), and `rejected` (rose).

### Atomic Audit Trail Logging
Upon form submission, the backend runs a secure, multi-stage database **transaction**:
- **ThemeSubmission Creation**: Writes the candidate record with a default `pending` state, `savedToDataset` flag set to `false`, and null similarity score.
- **AuditLog Registration**: Commits a system-level audit event `daily_theme_submission_created` capturing the submission ID, dailyThemeId, imagePath, and caption metadata in raw JSON structure.

### Admin Review Portal (`/admin/daily-theme`)
We have created a dedicated, read-only administration area. It can be accessed directly from the sidebar navigation (registered via `src/lib/routes.ts`). It lets administrators inspect:
- **Calendar History**: A timeline of all system daily themes and accumulated submission counts.
- **Verification Ledger**: Deep logs disclosing submitter details, source image paths, validation states, and dataset enrollment flags.

### Dashboard Telemetry Feed (`/admin`)
The central `/admin` overview has been upgraded with a full-width **"Recent Daily Theme Submissions"** activity feed, giving managers rapid insights into creative assets entering the ingestion funnel.

> [!IMPORTANT]
> **Why uploads are not immediately used for training**:
> To guarantee the integrity, safety, and alignment of our model adapters, submissions do not automatically merge into active datasets. In the next phase, we will introduce a **CLIP-based semantic validation worker** that calculates cosine similarity metrics between the theme's prompt vector and the image vector. Submissions must exceed threshold levels and undergo human consent validation before they can be officially saved to a dataset.

## Step 11: Mock AI Image-Text Similarity Validator

We have implemented an AI-simulated daily theme similarity validator to prepare the platform's architecture for a live, GPU-backed CLIP/OpenCLIP semantic verification worker.

### The Validator Contract (`src/lib/theme-validation/types.ts`)
We defined strict TypeScript types for inputs and outputs:
- **`ThemeValidationInput`**: Accepts `imagePath`, `themeText`, and an optional `caption`.
- **`ThemeValidationResult`**: Returns:
  - `rawScore`: a value between `0.0` and `1.0` representing simulated cosine embedding similarity.
  - `displayScore`: a percentage score between `0` and `100`.
  - `status`: mapped dynamically as `"accepted"` (displayScore >= 70), `"needs_review"` (displayScore >= 50 and < 70), or `"rejected"` (displayScore < 50).
  - `provider`: name of the validator engine (`"mock-clip-engine-v1"`).
  - `explanation`: a detailed text summary describing why the score was assigned.

### Deterministic Keyword Overlap Engine (`src/lib/theme-validation/mock-validator.ts`)
To make this prototype stable and prevent flaky UI updates upon page reloads, the mock validator uses **string hashing** to establish deterministic scores based on the text inputs:
- **Concept Tokenization**: The daily theme prompt is tokenized and stripped of standard English filler stop-words (like *a, an, the, with, by*).
- **Keyword Scan**: The user's caption and image file path are scanned for keyword matches (with basic semantic stemming support, e.g. matching *fox* to *foxes* and *moonlight* to *moon*).
- **Match Ratios**:
  - **High Alignment (Score 82–96, Status `accepted`)**: Matches 100% of the theme's core terms.
  - **Partial Alignment (Score 55–67, Status `needs_review`)**: Matches at least 50% of the core terms.
  - **Minor Overlap (Score 35–46, Status `rejected`)**: Minor matching of a single term.
  - **No Overlap (Score 12–34, Status `rejected`)**: Zero matching keywords.

> [!NOTE]
> **Prototype Threshold Statement**:
> These are prototype thresholds. Real CLIP/OpenCLIP scores must be calibrated with real examples.

### Dynamic Submission Flow & Double Audit Trail (`src/app/daily-theme/actions.ts`)
When a user submits a candidate asset:
1.  The platform initiates a database **transaction**.
2.  It executes the `validateThemeSimilarity()` engine.
3.  The candidate is inserted into PostgreSQL with the calculated `clipSimilarityScore`, `validationStatus`, and a new `validationExplanation` column.
4.  Two audit log rows are written atomically:
    -   `daily_theme_submission_created`: Tracks initial upload details.
    -   `daily_theme_submission_validated`: Saves full telemetry containing `dailyThemeId`, `imagePath`, `themeText`, raw score, display score, final validation status, and explanation text.

### Refined User Experience (`/daily-theme`)
- **AI Evaluation Result Card**: Upon form submission, a beautifully styled, color-coded card slides into view revealing:
  - Theme match score percentage with an animated visual progress bar.
  - Evaluation status badge matching the severity colors (emerald, indigo, or rose).
  - An explanation message from the validator.
  - Compliance Warning: *"Accepted submissions are candidate training data only. Human review and consent checks are still required before training."*
- **Recent Submissions Table**: Displays the similarity score, status badge, caption, and the validation explanation.

### Administrative Oversight (`/admin/daily-theme` & `/admin`)
- **Warning Notice Header**: Displays a clear warning to platform operators:
  `This prototype uses a mock similarity validator. In production, this should be replaced with a real image-text embedding model such as CLIP or OpenCLIP, calibrated on accepted and rejected examples.`
- **Expanded Tables**: Integrates the validation explanation strings and similarity score badges directly inside the Verification Queue table and main Overview dashboard.

### Future Transition to Python CLIP Service
Later, the mock validator can be transparently replaced by a real image-text similarity worker:
1.  **Python Microservice**: Host a lightweight FastAPI service running PyTorch and Hugging Face's `transformers` library to load the `openai/clip-vit-base-patch32` model.
2.  **Cosine Similarity Calculation**: The microservice will accept the image file and the theme prompt, compute their respective text and image embedding vectors, and return the cosine similarity score (typically scaled between 0 and 100).
3.  **API Swap**: Update `src/lib/theme-validation/mock-validator.ts` to make an HTTP `fetch()` request to this Python service instead of executing the keyword overlap logic. The TypeScript signatures and database columns remain completely unchanged.

## Preparing Museum Prototype Datasets

This prototype contains automated tooling to organize and ingest public-domain artwork datasets for Katsushika Hokusai and Utagawa Hiroshige. 

### Recommended Dataset Guidelines
* **Image Count**: Recommended size is 30 to 80 high-resolution images per artist style for optimal LoRA fine-tuning.
* **Format**: Standard image formats (`.png`, `.jpg`, `.jpeg`, `.webp`).
* **Captions**: Write descriptive text matching the visual traits of the print (e.g., color, elements, style markers) and place them in matching `.txt` files inside the `captions` folder.
* **Copyright Rules**: Only use public-domain or open-access images from verified sources (e.g., Metropolitan Museum of Art, Tokyo National Museum). Document full provenance in the `SOURCES.md` folder of the dataset version.

### Steps to Prepare and Import

1. **Folder Setup**:
   Place high-resolution images in:
   - `data/artists/hokusai/v1/raw/` for Katsushika Hokusai
   - `data/artists/hiroshige/v1/raw/` for Utagawa Hiroshige
   
   Place matching txt captions in:
   - `data/artists/hokusai/v1/captions/`
   - `data/artists/hiroshige/v1/captions/`

2. **Generate Manifest**:
   Run the TypeScript compiler script to automatically detect file dimensions, calculate SHA-256 integrity hashes, associate captions, and write out a unified `manifest.json` catalog:
   ```bash
   npm run dataset:prepare -- --artist hokusai --version v1
   ```

3. **Document Provenance**:
   Open `data/artists/{artistSlug}/v1/SOURCES.md` and complete the legal provenance list with the source museum and public-domain URLs.

4. **Import to Database**:
   Ingest the manifest catalog directly into Postgres:
   ```bash
   npm run dataset:import -- --artist hokusai --version v1
   ```

## LoRA Training Prototype Workflow

This folder hosts offline template files and checklists to fine-tune Stable Diffusion 1.5 LoRA style adapters from public-domain datasets.

### Architectural Workflow Overview
1. **Dataset Preparation**: Curate images and captions locally in `data/artists/...` and import their manifest to Postgres (`npm run dataset:import`).
2. **Pre-Training Checklist**: Consult the [dataset_export_checklist.md](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_training/dataset_export_checklist.md) to verify directory hygiene, trigger tokens, and caption prefixes.
3. **External Fine-Tuning**: Copy and execute code from the [lora_training_template.md](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_training/lora_training_template.md) in free-GPU environments like **Google Colab** or **Kaggle**.
4. **Adapter Ingestion**: Once training finishes, download the resulting `.safetensors` file, place it in `models/adapters/{artistSlug}-lora-v1.safetensors`, and register the adapter's metadata inside the [/admin/adapters](http://localhost:3000/admin/adapters) portal.

*Note: Model training and high-compute GPU processes remain offline and fully decoupled from the web application server to preserve scalability and minimize cost.*

## Manual Real-Generation Result Workflow

This platform implements a manual completion workflow to bridge external model execution in Google Colab / Kaggle with our online registry.

### Step-by-Step Operations

1. **Trigger Request**:
   Go to [/generate](http://localhost:3000/generate) in the browser, select your target artist, input a custom prompt, and submit the generation. This inserts a record in `queued` status into the database.

2. **Run External Inference**:
   Open [/admin/generations](http://localhost:3000/admin/generations), find your queued request, and click **Inspect**.
   - Copy the exact details (prompt, trigger tokens, seeds, configurations) from the **Notebook Inference Helper** card.
   - Execute the inference code inside your Colab/Kaggle notebook to generate the ukiyo-e print.

3. **Attach Output Result**:
   Once the final image is generated, upload it to your web server (or use a public storage path/link), return to `/admin/generations`, select the active request, and fill in the manual completion form:
   - **Output Image Path**: Link or path of the generated print.
   - **Final Seed / Parameters**: Ensure generation telemetry is documented.
   - **Admin Note**: Outline any notes regarding training run or steps.

4. **Verify Ledger & Showrooms**:
   Submitting the completion form will update the status of the generation to `completed`, atomically record a JPY 50 royalty event credited to the corresponding artist style, and produce audit logs.
   - Verify the image, prompt, and style metadata render in the public showroom at [/gallery](http://localhost:3000/gallery).
   - Verify the royalty events and aggregates are accounted for on [/admin/royalties](http://localhost:3000/admin/royalties).

*Note: This manual pipeline is a prototype-only bridge. Future iterations will replace these manual steps with an automated task worker and GPU inference backend.*

## External LoRA Inference Workflow

For this prototype, image rendering is performed in external notebooks rather than directly inside the Next.js process.

### Workflow Integration & Design

1. **Decoupled Architecture**: High-computational rendering workloads are fully decoupled from our lightweight client-facing Next.js servers to maximize cost-efficiency and performance, eliminating any paid GPU hosting requirements.
2. **Notebook Code Resources**: Templates, verification guidelines, and step-by-step notebooks are maintained in:
   - [lora_inference_template.md](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_inference/lora_inference_template.md): A reproducible, seed-locked model loader script matching platform outputs.
   - [generation_request_checklist.md](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_inference/generation_request_checklist.md): A pre-flight and post-flight operational sanity sheet.
3. **Execution & Attachment**: Administrators copy prompts, adapter paths, and seeds from `/admin/generations`, run them inside Google Colab/Kaggle, host the final generated ukiyo-e print, and paste the URL back to resolve the task and log royalties.
4. **Transition to Automated Services**: In future production builds, this manual cycle will be swapped for a distributed message queue (e.g. BullMQ, Redis, or Celery) that dispatches tasks to an autonomous, autoscaling GPU inference worker service.

## Audit Logs and Governance Trail

To support ethical AI compliance and verify attribution pathways, the platform integrates a comprehensive, read-only administrative **Governance & Audit Trail** dashboard at `/admin/audit-logs`.

### 🛡️ Why This Matters
For artist-style fine-tuning and platform generations, maintaining a verifiable, trace-to-source audit trail is paramount:
1. **Legal Attribution**: Proves that every simulated royalty payout is tied to a specific image generation request and contributing creator style.
2. **Data Provenance**: Documents exactly who approved, checked, or ingested custom user drawings and museum artifacts into style training datasets.
3. **Traceability**: Demonstrates to museum partners and users that all actions—from style registration to validation thresholds—are recorded.

### 📋 Currently Logged Actions
The system automatically logs audit trail events under the following categories:
- `dataset_image_registered`: Manual cataloging of style dataset image metadata.
- `model_adapter_registered`: Deployed LoRA style weights registration.
- `generation_requested`: User-triggered image generation request.
- `generation_completed`: Resolution of generated results, including offline attachment uploads.
- `royalty_event_created`: Attribution payouts logged per generation completion.
- `daily_theme_submission_created`: User drawing or upload submitted to the active Daily Theme.
- `daily_theme_submission_validated`: Automated CLIP or mock theme compliance checks.
- `theme_submission_saved_to_dataset`: Administrative ingestion of accepted theme drawings into style training sets.

### 🔍 How to View and Audit
1. Navigate to the **Admin Dashboard** at [/admin](http://localhost:3000/admin).
2. Look for the **Governance & Compliance Summary** panel, summarizing key telemetry and latest events.
3. Click **Examine full audit trail** or navigate to [/admin/audit-logs](http://localhost:3000/admin/audit-logs) to access the main ledger.
4. Utilize client-side selectors to filter events by **Action** or **Entity Type**, or type in the **Search Box** to scan actions, actor IDs, or nested metadata JSON instantly.
5. Click **Raw JSON** on any row to expand the `<details>` / `<summary>` block and preview the full raw metadata JSON payload.

### 🚀 Production Roadmap & Best Practices
For a production-ready enterprise deployment:
- **Authenticated Actors**: Session middleware must inject verified, cryptographic administrative user IDs as the `actorId` (rather than prototype-level anonymous actions).
- **Tamper-Resistant Logging**: Swap local database logging for an immutable, append-only security information stream (e.g. AWS CloudTrail, Google Cloud Logging, or write-once ledger databases like Amazon QLDB).

## Available Scripts

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run dataset:prepare
npm run dataset:import
```
