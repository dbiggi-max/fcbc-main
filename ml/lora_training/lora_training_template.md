# LoRA Training Template — Google Colab & Kaggle Guide

This document is a complete, step-by-step notebook-style guide. You can copy the code blocks directly into code cells in a Google Colab or Kaggle notebook equipped with a free GPU (e.g. T4 or P100) to train your ukiyo-e style adapter.

---

## 🛠️ Step A: Environment Setup

### 1. Enable GPU Acceleration
Ensure your notebook session is configured with a GPU:
- **Google Colab**: Go to `Runtime` ➡️ `Change runtime type` ➡️ select **T4 GPU** or **A100 GPU** ➡️ click `Save`.
- **Kaggle**: Go to the right sidebar settings ➡️ under `Accelerator` ➡️ select **GPU T4 x2** or **GPU P100**.

### 2. Verify GPU Availability
Run this cell to confirm PyTorch detects your GPU:

```python
import torch
if torch.cuda.is_available():
    print(f"✅ GPU is active: {torch.cuda.get_device_name(0)}")
    print(f"VRAM Available: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
else:
    print("❌ ERROR: No GPU detected. Change your runtime accelerator in settings.")
```

### 3. Install Dependencies
Install Hugging Face's `diffusers` library, `accelerate`, and standard fine-tuning dependencies:

```bash
pip install -q diffusers transformers accelerate ftfy tensorboard peft image-size
```

### 4. Mount Storage or Upload Dataset
Zip and upload your prepared dataset from the platform (e.g. `data/artists/hokusai/v1/` directory) to your notebook, or mount Google Drive:

```python
# Optional: Mount Google Drive if you stored your dataset there
from google.colab import drive
drive.mount('/content/drive')
```

---

## 📂 Step B: Dataset Structure

The fine-tuning script expects a clean, flat directory containing your raw images alongside their text captions. Unzip your files so they match the following layout in the environment storage:

```text
/content/dataset/
  ├── raw/
  │    ├── image_01.jpg
  │    ├── image_02.png
  │    └── hokusai_great_wave_test.png
  └── captions/
       ├── image_01.txt
       ├── image_02.txt
       └── hokusai_great_wave_test.txt
```

---

## ⚙️ Step C: Artist-Specific Configuration

Define your target artist profile parameters. This ensures output files, paths, and training variables align with our web platform database seeds:

```python
# Set your active configuration here

# ====== Option 1: Katsushika Hokusai ======
ARTIST_SLUG = "hokusai"
ARTIST_DISPLAY_NAME = "Katsushika Hokusai"
TRIGGER_TOKEN = "hokusai_style"
BASE_MODEL = "runwayml/stable-diffusion-v1-5"
OUTPUT_LORA_NAME = "hokusai-lora-v1"

# ====== Option 2: Utagawa Hiroshige ======
# ARTIST_SLUG = "hiroshige"
# ARTIST_DISPLAY_NAME = "Utagawa Hiroshige"
# TRIGGER_TOKEN = "hiroshige_style"
# BASE_MODEL = "runwayml/stable-diffusion-v1-5"
# OUTPUT_LORA_NAME = "hiroshige-lora-v1"

print(f"🎯 Fine-Tuning Configuration Loaded:")
print(f"👉 Target Artist : {ARTIST_DISPLAY_NAME} ({ARTIST_SLUG})")
print(f"👉 Trigger Token : {TRIGGER_TOKEN}")
print(f"👉 Base Model    : {BASE_MODEL}")
print(f"👉 Output File   : {OUTPUT_LORA_NAME}.safetensors")
```

---

## ✍️ Step D: Caption Guidance & Structuring

For Stable Diffusion 1.5 style fine-tuning, captions should be highly aligned with the target **Trigger Token**.

### 1. Caption Formatting Rule
Every caption file must start with the `TRIGGER_TOKEN`, followed by a comma, followed by a factual description of the composition. 

* **✅ Good Hokusai Caption Example** (`hokusai_great_wave_test.txt`):
  `hokusai_style, ukiyo-e woodblock print representing giant blue and white waves crushing wooden boats in front of Mount Fuji`
* **✅ Good Hiroshige Caption Example**:
  `hiroshige_style, ukiyo-e woodblock print representing a quiet bridge during a sudden shower, with dark vertical rain streaks and silhouettes of travelers carrying umbrellas`

### 2. Guardrails & Best Practices
* **Keep Captions Factual**: Describe actual visual elements (colors, subjects, lines, atmosphere) instead of abstract qualities.
* **Never Mix Styles**: Maintain strictly separate datasets. Do not train Hokusai images with Hiroshige trigger tokens or put them in the same directory.
* **No Copyrighted Living Artists**: Only train on authorized public-domain artworks sourced from partner museum open-access archives.
* **No Raw User Submissions**: Do not use raw daily creative submissions from users for model fine-tuning unless they have cleared official moderator review, safety alignment filters, and explicit license/copyright consents.

---

## 🚀 Step E: Training Approach

For Stable Diffusion 1.5, we utilize Hugging Face Diffusers' standard LoRA fine-tuning scripts.

### 1. Download Training Utility
Download the official text-to-image LoRA training script:

```bash
wget -q https://raw.githubusercontent.com/huggingface/diffusers/main/examples/text_to_image/train_text_to_image_lora.py
```

### 2. Configure Hugging Face Accelerate
Initialize a default low-memory training configuration:

```python
import os
from accelerate.utils import write_basic_config
write_basic_config(mixed_precision="fp16")
print("✅ Accelerate configuration written successfully.")
```

### 3. Launch Fine-Tuning Loop
Run the training script. This script loads the base model, feeds your processed image-text pairs through the cross-attention network, and optimizes the LoRA weights:

```bash
# We use environment variables mapped from our Python configuration cells
export MODEL_NAME="runwayml/stable-diffusion-v1-5"
export DATASET_DIR="/content/dataset/raw" # point directly to the folder with images
export OUTPUT_DIR="/content/output"

accelerate launch train_text_to_image_lora.py \
  --pretrained_model_name_or_path="$MODEL_NAME" \
  --train_data_dir="$DATASET_DIR" \
  --resolution=512 \
  --center_crop \
  --random_flip \
  --train_batch_size=1 \
  --gradient_accumulation_steps=4 \
  --learning_rate=1e-4 \
  --lr_scheduler="cosine" \
  --lr_warmup_steps=0 \
  --max_train_steps=1000 \
  --checkpointing_steps=250 \
  --output_dir="$OUTPUT_DIR" \
  --seed=42

# NOTE: Since we are using standard txt captions, the train script will automatically
# look for companion .txt files sharing the exact file base-names.
```

> [!NOTE]
> Training parameters (e.g. `max_train_steps`, `learning_rate`) can be tweaked depending on the number of images in your dataset. As a baseline rule of thumb, target **80–120 steps per image** (e.g., 30 images $\approx$ 1000 total optimization steps).

---

## 📦 Step F: Exporting the LoRA Weights

Once the training completes, the script will output `.safetensors` model weights into the output directory.

### 1. Relocate and Rename
Rename the compiled file to match our platform's adapter convention:

```python
import os
import shutil

src_lora_path = "/content/output/pytorch_lora_weights.safetensors"
dest_lora_path = f"/content/output/{OUTPUT_LORA_NAME}.safetensors"

if os.path.exists(src_lora_path):
    shutil.move(src_lora_path, dest_lora_path)
    print(f"🎉 Success! LoRA weights compiled and renamed to: {dest_lora_path}")
else:
    print("❌ ERROR: Weights file not found in output folder. Check training logs.")
```

### 2. Download Adapter File
Download the generated `{artistSlug}-lora-v1.safetensors` file and place it inside the Next.js workspace folder path:
👉 `models/adapters/{artistSlug}-lora-v1.safetensors`

---

## 🎨 Step G: Test Inference in Notebook

Run a local verification loop inside the notebook to inspect style fidelity before deploying the model back to the platform:

```python
from diffusers import StableDiffusionPipeline
import torch

# 1. Load standard base model
pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5", 
    torch_dtype=torch.float16
).to("cuda")

# 2. Inject your newly trained LoRA weights
pipe.load_lora_weights("/content/output/", weight_name=f"{OUTPUT_LORA_NAME}.safetensors")

# 3. Test prompts matching the active artists
hokusai_prompt = "hokusai_style, a fox under the moonlight, ukiyo-e woodblock print, detailed waves, dramatic composition"
hiroshige_prompt = "hiroshige_style, a quiet bridge in the rain, ukiyo-e woodblock print, soft atmosphere"

active_prompt = hokusai_prompt if ARTIST_SLUG == "hokusai" else hiroshige_prompt

print(f"🎨 Generating test artwork using prompt:\n' {active_prompt} '")
image = pipe(active_prompt, num_inference_steps=30, guidance_scale=7.5).images[0]

# Save and preview image
image.save("/content/test_inference_output.png")
image
```

---

## 📥 Step H: Register Back Into the Platform

Once you download the finished `.safetensors` adapter file and save it inside your local directory at `models/adapters/`, follow these steps to register it in the administration area:

1. Start your local development server (`npm run dev`) and open [/admin/adapters](http://localhost:3000/admin/adapters) in your web browser.
2. Complete the **Register Style Adapter** form using the metadata parameters:
   - **Artist**: Select Katsushika Hokusai or Utagawa Hiroshige.
   - **Dataset Version**: Select the matching version (e.g. `hokusai-v1-manual`).
   - **Adapter Name**: Name of the model (e.g. `Hokusai LoRA v1`).
   - **Base Model**: `runwayml/stable-diffusion-v1-5`.
   - **Adapter Type**: Select `lora`.
   - **File Path**: `models/adapters/hokusai-lora-v1.safetensors` or `models/adapters/hiroshige-lora-v1.safetensors`.
   - **Trigger Token**: `hokusai_style` or `hiroshige_style`.
   - **Status**: Mark as `ready` (or `testing` to run validation reviews first).
   - **Training notebook URL**: Add the URL link of the Colab or Kaggle session you used for this run.

---

## ⚠️ Step I: Operational Warnings & Safeguards
- **Colab/Kaggle Preemption**: Free-tier systems may terminate your session without warning if you exceed standard inactivity timers or compute allowances. Always keep your local datasets backed up.
- **Style Distortion**: If your outputs are abstract, blurry, or fail to show the requested style, reduce the `learning_rate` (e.g., to `5e-5`) or check that your text files contain the proper `TRIGGER_TOKEN` prefix.
- **Copyright Integrity**: Do not inject modern copyrighted artwork or train style adapters on living artists. Our platform is restricted to legal public-domain museum assets.
