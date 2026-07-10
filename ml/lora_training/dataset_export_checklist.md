# Pre-Training Dataset Verification Checklist

Use this audit checklist to review dataset hygiene, license records, caption structure, and database alignment before exporting images and text captions to external LoRA training containers.

---

## 📋 Pre-Training Audit

- [ ] **Artist slug confirmed**
  The artist slug matches exactly with database-seeded keywords (e.g. `hokusai` or `hiroshige`).
  
- [ ] **Dataset version confirmed**
  Target version is correctly mapped (e.g. `v1` pointing to `seed-dataset-{slug}-v1`).

- [ ] **30–80 images collected**
  The raw image folder contains between 30 and 80 representative high-resolution prints. Fewer than 30 may cause poor generalization; more than 80 may slow down training on free GPU tiers.

- [ ] **Images are authorized/public-domain/open-access**
  All images are confirmed public-domain or open-access. No unauthorized modern or copyrighted files are mixed in.

- [ ] **Source URLs documented**
  Original museum collection source records are compiled and stored in `SOURCES.md`.

- [ ] **Captions prepared**
  A companion `.txt` file exists for every image, named identically to the image base file (e.g., `great_wave.txt` matching `great_wave.png`).

- [ ] **Trigger token prefixed**
  Every caption file starts with the explicit artist style trigger token (e.g., `hokusai_style, ...` or `hiroshige_style, ...`) to align cross-attention weights.

- [ ] **No mixed artists**
  The dataset directory is strictly isolated. Hokusai prints are not stored inside Hiroshige directories, and vice versa.

- [ ] **No duplicate images**
  Files are unique. The manifest compiler script has verified that there are no overlapping SHA-256 hashes.

- [ ] **No low-quality images**
  Extremely low-resolution, blurry, watermarked, or artifact-heavy images have been filtered out.

- [ ] **Dataset manifest generated**
  The compiler script has completed execution successfully:
  ```bash
  npm run dataset:prepare -- --artist {artistSlug} --version v1
  ```

- [ ] **Dataset imported into database**
  The manifest file has been ingested into the Postgres schema, updating version image counts and recording the systemic audit logs:
  ```bash
  npm run dataset:import -- --artist {artistSlug} --version v1
  ```

- [ ] **LoRA trigger token selected**
  The trigger token matches the token preloaded in the `ModelAdapter` schema (e.g. `hokusai_style` or `hiroshige_style`).

- [ ] **License/rights notes reviewed**
  The corresponding `ConsentOrLicenseRecord` matches and validates rights bases (e.g. "Public Domain / Open Access").

- [ ] **Training output destination decided**
  An offline backup directory or Google Drive folder is configured to receive and preserve compiled checkpoints during training.
