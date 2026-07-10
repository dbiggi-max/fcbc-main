# LoRA Training Workflows & Templates

This directory houses resources, configurations, checklists, and step-by-step notebook templates for training Stable Diffusion 1.5 style adapters (LoRAs) using museum public-domain datasets.

---

## 🎯 Purpose of This Directory
This directory serves as the bridge between dataset curation (which occurs on-platform inside the Next.js administration panel) and actual model fine-tuning (which occurs in external GPU environments like Google Colab or Kaggle). It contains:
1. An execution-ready, notebook-style training template ([lora_training_template.md](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_training/lora_training_template.md)).
2. A pre-training preparation audit list ([dataset_export_checklist.md](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_training/dataset_export_checklist.md)).

---

## 🎨 Why LoRA (Low-Rank Adaptation)?
Low-Rank Adaptation (LoRA) is an exceptionally efficient fine-tuning technique that injects small, trainable rank-decomposition matrices into the cross-attention layers of Stable Diffusion. 
- **Lightweight Storage**: Instead of compiling a full 2-4GB checkpoint for each style, a LoRA adapter compiles to a lightweight file (typically 10-150MB), making it fast to deploy, swap, and serve dynamically.
- **Style Isolation**: Each artist style gets its own dedicated adapter file (e.g. `hokusai-lora-v1.safetensors`, `hiroshige-lora-v1.safetensors`). This guarantees that Katsushika Hokusai's clean linework and Utagawa Hiroshige's atmospheric rain dynamics do not bleed into one another, allowing precise selection at inference time.

---

## ⚡ Architectural Separation
Fine-tuning generative AI models requires intense, continuous floating-point operations (FLOPS) and substantial dedicated VRAM (ideally 16GB+).
- **No Heavy Server-Side Compute**: To prevent high cloud operating costs and potential server hangs, model training is completely decoupled from the Next.js web application.
- **Offline Training**: Training is performed asynchronously in standard deep-learning computational sandboxes (like Google Colab, Kaggle, or local workstation environments).
- **Declarative Web Registry**: Once the external training is completed, the administrator registers the adapter's metadata (trigger tokens, paths, base models) in the `/admin/adapters` panel, allowing the web app to index and present the style options to users.

---

## ⚠️ Prototype Infrastructure Limitations
* **GPU Session Instability**: Free runtimes (such as Google Colab or Kaggle) are subject to resource preemption, inactive session timeouts, and unpredictable disconnects. Always download intermediate checkpoints during training.
* **Non-Production Design**: This workflow is meant for initial style exploration and concept validation. Production-grade systems should transition to orchestrated batch training jobs (e.g., AWS SageMaker, RunPod serverless, or custom Kubernetes GPU clusters) with automated dataset pipelines.
