# 🖥️ ML Image Theme Validator (OpenAI CLIP)

This directory contains a standalone, local Python prototype that implements a **theme-specific, multi-signal CLIP validator**. It compares a drawing with positive prompts, nearby confusions, and unrelated background prompts instead of treating one raw cosine as a verdict.

This script acts as the machine learning engine that can later replace the lightweight mock similarity engine currently utilized in the main Next.js submission stack.

---

## 📂 Core Files Created

- **`validate_image_theme.py`**: Standalone CLI script executing CLIP image-text embeddings and matching.
- **`requirements.txt`**: Package manifests (PyTorch, Hugging Face transformers, Pillow, NumPy, Requests).
- **`README.md`**: Comprehensive guide for environment installation, triggers, calibration, and integration.

---

## 🛠️ Installation & Setup

### 1. Create a Python Virtual Environment
We recommend using a clean virtual environment (`venv`) to isolate ML libraries from system-wide Python environments:

```bash
# Navigate to the ML validator folder
cd ml/image_theme_validator

# Create the virtual environment named 'venv'
python3 -m venv venv

# Activate the virtual environment
# On macOS / Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2. Install Package Dependencies
Install the required machine learning and web dependencies listed in `requirements.txt`:

```bash
pip install -r requirements.txt
```

*(Note: Downloading `torch` and `transformers` might take a few moments depending on your network connection speed.)*

---

## 🚀 Running the Validator

The validator accepts CLI parameters to perform semantic similarity operations. Run the script using the following argument scheme:

```bash
python validate_image_theme.py \
  --image <local-path-or-url-or-base64> \
  --theme "<daily-theme>" \
  --caption "<optional-creator-context>" \
  --generated-caption "<caption-produced-by-an-image-captioner>" \
  --positive-prompts-json '["a drawing of a dragon", "a sketch of a dragon"]' \
  --negative-prompts-json '["lizard", "dinosaur", "snake"]' \
  --threshold-accept <float> \
  --threshold-review <float>
```

### Argument Reference
| Argument | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `--image` | **Yes** | - | Path to local file (e.g. `./fox.png`), remote URL, or Base64 data stream. |
| `--theme` | **Yes** | - | The exact text of the daily theme (e.g., `loneliness`, `cat`, `dragon`). |
| `--caption` | No | `""` | Creator context only. It is deliberately not used as scoring evidence. |
| `--generated-caption` | No | `""` | Caption independently produced from the image; enables the caption-theme signal. |
| `--positive-prompts-json` | No | generated | Theme-specific positive prompt array. |
| `--negative-prompts-json` | No | generated | Theme-specific confusion prompt array. |
| `--threshold-accept` | No | `0.12` | Per-theme raw ensemble threshold for provisional AI acceptance. |
| `--threshold-review` | No | `0.04` | Per-theme review floor. Lower scores are temporarily rejected. |

---

## 🧪 Real Test Execution Scenarios

### 1. Accepted-Style Case
When an artist submits a matching sketch of a fox corresponding to a "fox under moonlight" challenge:

```bash
python validate_image_theme.py \
  --image "../../public/placeholder-generated-image.png" \
  --theme "fox under moonlight" \
  --caption "A simple minimalist drawing of an orange fox under the stars"
```

### 2. Needs-Review (Borderline) Style Case
When a drawing matches some aspects of the theme but is conceptually borderline (e.g., a generic nocturnal outline):

```bash
python validate_image_theme.py \
  --image "../../public/placeholder-generated-image.png" \
  --theme "fox under moonlight" \
  --caption "animal at night" \
  --threshold-accept 0.35 \
  --threshold-review 0.22
```

### 3. Rejected-Style Case
When a drawing is completely unrelated to the daily theme (e.g., submitting a vehicle drawing during an animal challenge):

```bash
python validate_image_theme.py \
  --image "../../public/placeholder-generated-image.png" \
  --theme "fox under moonlight" \
  --caption "sports car in city"
```

---

## 📊 Output JSON Format

All results are written directly to `stdout` in valid JSON format. 

### Successful Match Output Example
```json
{
  "positiveSimilarity": 0.3154,
  "negativeSimilarity": 0.1702,
  "marginSimilarity": 0.1452,
  "captionThemeSimilarity": 0.3021,
  "backgroundZScore": 2.34,
  "finalScore": 0.2697,
  "displayScore": 99,
  "thresholdUsed": 0.12,
  "status": "accepted",
  "provider": "openai/clip-vit-base-patch32"
}
```

### Graceful Error Response Example
If the image file is corrupted or a remote URL fails to resolve, a standardized JSON format is returned instead of printing messy Python stack traces:
```json
{
  "error": true,
  "message": "Failed to load local image file: [Errno 2] No such file or directory: 'invalid_fox.png'"
}
```

---

## 📈 Understanding the Similarity Logic & Calibration

### Ensemble score and normalization
CLIP projects the image and every prompt into a normalized shared embedding space. The decision score is:

$$0.50 \times positiveMean + 0.25 \times captionTheme + 0.25 \times (positiveMean-negativeMax)$$

When no independently generated caption is available, its weight is redistributed across the positive mean and margin. `backgroundZScore` reports how unusual the theme match is relative to unrelated prompts. `displayScore` is presentation-only; decisions use the raw score and recorded per-theme threshold.

> [!WARNING]
> **CLIP similarity thresholds are not universal.** These values must be calibrated with real accepted/rejected examples before production use. Fine-tuning thresholds on a small set of representative flat drawings, sketches, and abstract motifs is highly recommended.

---

## 🧑‍💻 Why Human-in-the-Loop Moderation is Required

While CLIP excels at capturing semantic, non-literal connections (such as equating a dark silhouette with "loneliness"), it still has blind spots:
1. **No Fine-grained OCR/Text Checks**: It can fail to properly reject text-only or "doodle with unrelated words" submissions.
2. **Abstract Coincidences**: Abstract scribbles can occasionally yield inflated scores due to color correlations (e.g. blue strokes matching "ocean" even if the artwork is a random scribble).
3. **Dataset Poisoning Mitigation**: To prevent noisy, low-quality, or malicious drawings from polluting future training models, administrators **must** manually review and approve submissions as a separate step before admitting them into the style catalog.

---

## 🔗 How to Connect this to the Next.js App

When you are ready to fully transition from the current TypeScript mock validator to this real python engine, follow these steps:

1. **Leverage Node `child_process`**:
   Inside `src/lib/theme-validation/mock-validator.ts` or a new validator file, spawn the Python interpreter to run our script and capture the JSON stdout:

   ```typescript
   import { execFile } from "child_process";
   import path from "path";

   export async function callRealClipValidator(
     imagePath: string,
     themeText: string,
     caption?: string
   ): Promise<any> {
     const scriptPath = path.join(process.cwd(), "ml/image_theme_validator/validate_image_theme.py");
     const pythonPath = path.join(process.cwd(), "ml/image_theme_validator/venv/bin/python3");

     return new Promise((resolve, reject) => {
       execFile(
         pythonPath,
         [
           scriptPath,
           "--image", imagePath,
           "--theme", themeText,
           "--caption", caption || "",
           "--threshold-accept", "0.12",
           "--threshold-review", "0.04"
         ],
         (error, stdout, stderr) => {
           if (error) {
             reject(new Error(`Python validator exited with error: ${stderr || error.message}`));
             return;
           }
           try {
             const result = JSON.parse(stdout.trim());
             resolve(result);
           } catch (parseError) {
             reject(new Error(`Failed to parse Python validator JSON stdout: ${stdout}`));
           }
         }
       );
     });
   }
   ```

2. **Base64 Direct Compatibility**:
   Since Next.js drawing submissions are exported as Base64 strings, our `validate_image_theme.py` automatically parses Base64 strings out-of-the-box! There is no need to write intermediate files to disk or make filesystem transfers, making the bridge lightweight and fast.
