# LoRA Inference Workflows & Templates

This directory contains resources, checklists, and code templates for running image generation (inference) with trained Stable Diffusion 1.5 LoRA style adapters inside external, GPU-equipped sandboxes.

---

## 🎯 Purpose of This Directory
Because standard web application servers lack the high-performance GPUs (VRAM, CUDA cores) required to run neural image generation in real-time, this workspace employs a **manual completion loop**.
1. **Creation**: An administrator or user queues a design request in the web app at [/generate](http://localhost:3000/generate).
2. **Offline Inference**: The operator copies the generation's prompts, seeds, negative prompts, and adapter paths from the admin panel and pastes them into an external, free-GPU notebook (Google Colab or Kaggle).
3. **Execution**: The notebook loads the base model, injects the artist's LoRA adapter, and renders the image.
4. **Attaching Output**: The operator uploads or hosts the output image, copies its link/path, and pastes it into the completed generation request form at [/admin/generations](http://localhost:3000/admin/generations) to trigger artist attribution and simulated royalty events.

---

## 📚 Contents
- [lora_inference_template.md](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_inference/lora_inference_template.md): A step-by-step notebook guide containing PyTorch, Diffusers, and PIL saving code blocks that can be copied directly into Colab/Kaggle cells.
- [generation_request_checklist.md](file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_inference/generation_request_checklist.md): A comprehensive 14-point audit to verify prompts, seeds, adapter states, output directories, and platform registries before and after inference.

---

## ⚡ Architectural Separation Statement
This manual bridge is a **prototype-only architecture** designed to validate style adaptation and attribution without incurring heavy cloud hosting fees or maintaining idle GPU instances. 

In a production environment, this manual sequence will be replaced by an automated **GPU inference queue** (e.g. running on RunPod, Replicate, or AWS SageMaker), where Next.js pushes generation tasks to a message broker (like RabbitMQ or Redis BullMQ) and an autonomous GPU worker processes the images and returns results via webhooks.
