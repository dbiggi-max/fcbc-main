# LoRA Inference Template — Google Colab & Kaggle Guide

Copy the markdown cells and code blocks below directly into a Google Colab or Kaggle notebook powered by a GPU (e.g., T4 or P100) to execute high-fidelity style inference using your custom trained adapters.

---

## 🛠️ Step A: Environment Setup

### 1. Configure GPU Runtime
Ensure your notebook is running on a GPU instance:
- **Google Colab**: Select `Runtime` ➡️ `Change runtime type` ➡️ select **T4 GPU** ➡️ click `Save`.
- **Kaggle**: In the settings sidebar, select **GPU T4** or **GPU P100** under `Accelerator`.

### 2. Verify GPU Readiness
Execute this cell to confirm PyTorch detects the active CUDA core:

```python
import torch
if torch.cuda.is_available():
    print(f"✅ GPU is active: {torch.cuda.get_device_name(0)}")
    print(f"CUDA Version: {torch.version.cuda}")
else:
    print("❌ ERROR: No GPU detected. Change your notebook accelerator in settings.")
```

### 3. Install Libraries
Install Hugging Face's `diffusers` engine, alongside `transformers`, `accelerate`, and mathematical optimization backends:

```bash
pip install -q diffusers transformers accelerate peft ftfy
```

### 4. Import Modules
Import the core pipeline classes and image processing utilities:

```python
import os
import random
import torch
from diffusers import StableDiffusionPipeline
from PIL import Image

print("✅ Libraries imported successfully.")
```

---

## ⚙️ Step B: Generation Parameters & Config

Define your target artist profile, loaded adapter path, prompt parameters, and random seeds. Copy these values directly from the **Inference Inspector** in your admin panel:

```python
# =====================================================================
# ⚙️ INFERENCE CONFIGURATION
# =====================================================================

# 1. Base Model & Relational Mappings
BASE_MODEL = "runwayml/stable-diffusion-v1-5"
ARTIST_SLUG = "hokusai"                     # or "hiroshige"
ARTIST_DISPLAY_NAME = "Katsushika Hokusai"   # or "Utagawa Hiroshige"
TRIGGER_TOKEN = "hokusai_style"             # or "hiroshige_style"
LORA_PATH = "/content/models/adapters/hokusai-lora-v1.safetensors"

# 2. Generation Prompt (Always start with the TRIGGER_TOKEN)
PROMPT = "hokusai_style, a fox under the moonlight, ukiyo-e woodblock print, dramatic composition, deep blue indigo sky"
NEGATIVE_PROMPT = "blurry, low quality, distorted, deformed, signature, modern, photographic"

# 3. Mathematical Parameters
SEED = 12345
NUM_INFERENCE_STEPS = 30
GUIDANCE_SCALE = 7.5
OUTPUT_FILENAME = "hokusai_fox_moonlight.png"

# =====================================================================
# 💡 EXAMPLE COFIG FOR HIROSHIGE
# =====================================================================
# ARTIST_SLUG = "hiroshige"
# ARTIST_DISPLAY_NAME = "Utagawa Hiroshige"
# TRIGGER_TOKEN = "hiroshige_style"
# LORA_PATH = "/content/models/adapters/hiroshige-lora-v1.safetensors"
# PROMPT = "hiroshige_style, a quiet bridge in the rain, ukiyo-e woodblock print, soft atmosphere, vertical rain streaks"
# SEED = 23456
# OUTPUT_FILENAME = "hiroshige_bridge_rain.png"

print(f"🎨 Selected Artist Adapter: {ARTIST_DISPLAY_NAME} ({ARTIST_SLUG})")
print(f"🔑 Trigger Token          : {TRIGGER_TOKEN}")
print(f"🖼️ Output Filename         : {OUTPUT_FILENAME}")
```

---

## 🚀 Step C: Load Base Stable Diffusion Pipeline

Load the pre-trained Stable Diffusion 1.5 weights from Hugging Face into GPU memory using half-precision float numbers (`float16`) to speed up generation:

```python
print(f"📥 Loading base model: {BASE_MODEL}...")

# Load standard pipeline
pipe = StableDiffusionPipeline.from_pretrained(
    BASE_MODEL, 
    torch_dtype=torch.float16,
    safety_checker=None  # Disable or keep default checker
).to("cuda")

# Enable memory optimizations for standard T4 cards
pipe.enable_attention_slicing()

print("✅ Base pipeline successfully loaded to GPU.")
```

*Note: The exact loading syntax is designed for Diffusers version `0.20.0` or newer. If you are using old versions, verify the model loader compatibility.*

---

## 🔒 Step D: Load Style LoRA Adapter

Inject your custom trained LoRA weights into the cross-attention layers of the base model:

```python
# Ensure the folder containing the adapter exists
if not os.path.exists(LORA_PATH):
    print(f"❌ ERROR: Could not find LoRA adapter file at: {LORA_PATH}")
    print("Please upload the .safetensors file before proceeding.")
else:
    print(f"🔌 Injecting LoRA adapter weights from: {LORA_PATH}...")
    
    # Load weights into attention layers
    pipe.load_lora_weights(
        os.path.dirname(LORA_PATH), 
        weight_name=os.path.basename(LORA_PATH)
    )
    
    print("🎉 Success! LoRA weights merged into the base pipeline.")
```

> [!WARNING]
> **Avoid Style Bleeding**:
> Ensure that the loaded LoRA file belongs exclusively to the selected artist. Do not mix Hokusai weights with Utagawa Hiroshige prompts, or load multiple style adapters together, as this will distort the generated art.

---

## 🎲 Step E: Run Reproducible Generation

Use a seed-locked random number generator to ensure that identical parameters yield identical outputs on any machine:

```python
print("🔮 Initiating generation loop...")

# Create seed-locked generator
generator = torch.Generator("cuda").manual_seed(SEED)

# Execute inference
with torch.autocast("cuda"):
    output = pipe(
        prompt=PROMPT,
        negative_prompt=NEGATIVE_PROMPT,
        num_inference_steps=NUM_INFERENCE_STEPS,
        guidance_scale=GUIDANCE_SCALE,
        generator=generator
    )

generated_image = output.images[0]
print("✅ Generation complete!")
```

---

## 💾 Step F: Save Rendered Output

Save the output print inside the notebook environment:

```python
output_dir = "/content/outputs"
os.makedirs(output_dir, exist_ok=True)

save_path = os.path.join(output_dir, OUTPUT_FILENAME)
generated_image.save(save_path)

print(f"💾 File successfully saved to: {save_path}")
# Render image in notebook
generated_image
```

---

## 📤 Step G: Expose and Host the Output Image

To link this output back to our Next.js application, the image must be accessible via a local path or a web URL.

1. **Option A: Local App Directory (Recommended)**:
   Download the generated file from the notebook and save it inside your local project workspace folder at:
   👉 `public/output/{OUTPUT_FILENAME}`
   In the admin completion form, you can refer to this image using its relative web path:
   👉 `/output/{OUTPUT_FILENAME}`

2. **Option B: Temporary Expose**:
   For rapid testing or demonstrations, upload the file to a fast image-sharing platform (e.g. Imgur, Postimages) and paste the direct HTTPS URL into the admin form.

3. **Option C: Production Storage**:
   Upload the image directly to your cloud storage bucket (e.g. AWS S3, Google Cloud Storage, Supabase Storage) and use its public URL.

---

## 📥 Step H: Register Result in Next.js

Once you have hosted your generated image:
1. Open your browser and go to [/admin/generations](http://localhost:3000/admin/generations).
2. Select your `queued` request and click **Inspect**.
3. Locate the **Attach Result** form at the bottom of the inspector sidebar.
4. Input the image URL or local path (e.g. `/output/hokusai_fox_moonlight.png`).
5. Click **Manually Complete Generation**.
6. Check [/admin/royalties](http://localhost:3000/admin/royalties) to verify the simulated artist royalty of **JPY 50** has logged and added to their ledger.
7. Open [/gallery](http://localhost:3000/gallery) to see your beautifully styled artwork on display in the showroom!
