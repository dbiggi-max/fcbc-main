# Generation Request Verification Checklist

Use this audit checklist to ensure that all generation parameters, adapters, and results align between the Next.js web registry and your external GPU inference notebook.

---

## 📋 Pre-Flight Audit (Inference Setup)

- [ ] **Generation request created in web app**
  An active, pending task is visible in the queue at [/admin/generations](http://localhost:3000/admin/generations) under `queued` or `failed` status.

- [ ] **Correct artist selected**
  The target style (e.g. `Katsushika Hokusai` or `Utagawa Hiroshige`) is matched correctly in the active request block.

- [ ] **Correct adapter selected**
  The request identifies the proper adapter reference (e.g. `Hokusai LoRA v1`).

- [ ] **Adapter status is ready or manually verified**
  The style adapter has been trained, downloaded, and its file is active on disk or loaded into the notebook.

- [ ] **Prompt includes trigger token**
  The generation prompt contains the exact trigger token at the start (e.g., `hokusai_style, ...` or `hiroshige_style, ...`).

- [ ] **Negative prompt copied**
  The negative prompt is fully copied from the inspector pane to prevent style degradation.

- [ ] **Seed copied**
  If specified, the seed number is copied to lock noise variations.

- [ ] **Steps copied**
  The step count (e.g. `30`) matches the client parameters.

- [ ] **Guidance scale copied**
  The classifier-free guidance scale (e.g. `7.5`) matches the client parameters.

- [ ] **LoRA file available in notebook**
  The custom `.safetensors` file is uploaded to the active notebook instance (e.g. `/content/models/adapters/`).

---

## 💾 Post-Flight Audit (Platform Registration)

- [ ] **Output image saved**
  The final generated image is saved inside the notebook environment (e.g., `/content/outputs/hokusai_fox_moonlight.png`).

- [ ] **Output path/URL pasted back into admin**
  The image has been downloaded and moved to `public/output/` in Next.js (relative path: `/output/image.png`) OR uploaded to cloud hosting, and its direct URL is pasted into the manual completion form.

- [ ] **Gallery checked**
  The public showroom at [/gallery](http://localhost:3000/gallery) is loaded and successfully renders the image, prompt, and style metadata.

- [ ] **Royalty event checked**
  The simulated billing list at [/admin/royalties](http://localhost:3000/admin/royalties) has successfully updated to register the JPY 50 royalty event credited to the corresponding artist.
