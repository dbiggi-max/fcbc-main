#!/usr/bin/env python3
"""Theme-specific, multi-signal CLIP/OpenCLIP validation with human-review buffer and linear score calibration."""

import argparse
import base64
import io
import json
import math
import os
import sys
import warnings

warnings.filterwarnings("ignore")

DEFAULT_ACCEPT_THRESHOLD = 0.45
DEFAULT_REJECT_THRESHOLD = 0.45
DEFAULT_RAW_MIN = 0.15
DEFAULT_RAW_MAX = 0.35

GENERIC_NEGATIVES = [
    "blank image",
    "random scribbles",
    "unrelated drawing",
    "generic abstract shapes",
    "text only",
    "random object",
    "meaningless marks",
]

BACKGROUND_PROMPTS = [
    "a kitchen appliance",
    "a city street",
    "an office document",
    "a piece of furniture",
    "a sporting event",
    "a geometric diagram",
    "an unrelated everyday scene",
    "a random photograph",
]

CONFUSIONS = {
    "dragon": ["lizard", "dinosaur", "snake", "bird", "generic fantasy monster"],
    "cat": ["dog", "fox", "rabbit", "tiger", "generic four-legged animal"],
    "fox": ["dog", "wolf", "cat", "coyote", "generic four-legged animal"],
    "apple": ["tomato", "peach", "orange", "cherry", "generic round fruit"],
    "car": ["truck", "bus", "motorcycle", "train", "generic vehicle"],
    "peace": ["war", "conflict", "anger", "chaos", "generic abstract artwork"],
    "freedom": ["confinement", "prison", "restriction", "captivity", "generic landscape"],
}

ABSTRACT_WORDS = {
    "freedom", "nostalgia", "peace", "kaizen", "loneliness", "memory", "hope",
    "love", "fear", "joy", "silence", "warmth", "time", "dream",
}


def load_image(image_input):
    from PIL import Image

    if image_input.startswith("data:image/"):
        encoded = image_input.split(",", 1)[-1]
        return Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")
    if image_input.startswith(("http://", "https://")):
        import requests
        response = requests.get(image_input, timeout=12)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    if not os.path.exists(image_input):
        raise FileNotFoundError(f"Local image file path does not exist: '{image_input}'")
    return Image.open(image_input).convert("RGB")


def is_abstract(theme):
    words = set(theme.lower().split())
    return bool(words & ABSTRACT_WORDS) or len(words) > 4


def positive_prompts(theme):
    if is_abstract(theme):
        return [
            f"a drawing representing {theme}",
            f"a symbolic illustration about {theme}",
            f"an artwork expressing {theme}",
            f"a visual metaphor for {theme}",
            f"a creative interpretation of {theme}",
            f"an image emotionally connected to {theme}",
        ]
    return [
        f"a drawing of {theme}",
        f"an illustration of {theme}",
        f"a sketch of {theme}",
        f"cartoon {theme}",
        f"a subject resembling {theme}",
        f"an artistic interpretation of {theme}",
    ]


def positive_prompts_for_strategy(theme, strategy):
    if strategy == "standard":
        return [
            f"a drawing of {theme}",
            f"an illustration of {theme}",
            f"a sketch of {theme}",
            f"an image of {theme}",
        ]
    elif strategy == "descriptive":
        return [
            f"a detailed visual representation of {theme}",
            f"a drawing depicting {theme} with realistic details",
            f"a clear illustration of {theme}",
            f"a clean sketch focused on {theme}",
        ]
    elif strategy == "metaphorical":
        return [
            f"a drawing representing {theme}",
            f"a symbolic illustration about {theme}",
            f"an artwork expressing the emotion of {theme}",
            f"a visual metaphor for {theme}",
        ]
    else: # hybrid
        return positive_prompts(theme)


def negative_prompts(theme):
    lower = theme.lower()
    nearby = next((items for key, items in CONFUSIONS.items() if key in lower), [])
    return nearby + GENERIC_NEGATIVES


def parse_prompt_json(raw, fallback):
    if not raw:
        return fallback
    try:
        value = json.loads(raw)
        if not isinstance(value, list) or not value or not all(isinstance(x, str) and x.strip() for x in value):
            raise ValueError("Prompt JSON must be a non-empty array of strings.")
        return [x.strip() for x in value]
    except Exception:
        return fallback


def mean(values):
    return sum(values) / len(values) if values else 0.0


def stddev(values):
    if not values or len(values) < 2:
        return 0.05
    avg = mean(values)
    return math.sqrt(sum((value - avg) ** 2 for value in values) / len(values))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True)
    parser.add_argument("--theme", required=True)
    parser.add_argument("--caption", default="", help="Creator context only; never used as validation evidence.")
    parser.add_argument("--generated-caption", default="", help="Caption produced independently by an image captioner.")
    parser.add_argument("--positive-prompts-json")
    parser.add_argument("--negative-prompts-json")
    
    # Advanced settings from DB
    parser.add_argument("--threshold-accept", type=float, default=DEFAULT_ACCEPT_THRESHOLD)
    parser.add_argument("--threshold-reject", type=float, default=DEFAULT_REJECT_THRESHOLD)
    parser.add_argument("--raw-min", type=float, default=DEFAULT_RAW_MIN)
    parser.add_argument("--raw-max", type=float, default=DEFAULT_RAW_MAX)
    parser.add_argument("--prompt-strategy", default="hybrid_similarity")
    parser.add_argument("--provider", default="mock")
    parser.add_argument("--model-name", default="ViT-B-32")
    parser.add_argument("--pretrained-name", default="laion2b_s34b_b79k")
    parser.add_argument("--device", default="")
    args = parser.parse_args()

    try:
        # Determine device
        device = "cpu"
        if args.device:
            device = args.device
        else:
            try:
                import torch
                if torch.cuda.is_available():
                    device = "cuda"
                elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                    device = "mps"
            except Exception:
                pass

        image = load_image(args.image)
        positives = parse_prompt_json(args.positive_prompts_json, positive_prompts_for_strategy(args.theme, args.prompt_strategy))
        negatives = parse_prompt_json(args.negative_prompts_json, negative_prompts(args.theme))

        # Check if we can and should use open_clip
        use_open_clip = False
        if args.provider in ["openclip", "python", "remote"] and args.model_name != "openai/clip-vit-base-patch32":
            try:
                import open_clip
                import torch
                use_open_clip = True
            except ImportError:
                pass

        if use_open_clip:
            import open_clip
            import torch
            
            # Load model, transforms and tokenizer
            model, _, preprocess = open_clip.create_model_and_transforms(
                args.model_name,
                pretrained=args.pretrained_name,
                device=device
            )
            tokenizer = open_clip.get_tokenizer(args.model_name)
            model.eval()

            # Encode image
            img_tensor = preprocess(image).unsqueeze(0).to(device)
            with torch.no_grad():
                image_embedding = model.encode_image(img_tensor)
                image_embedding /= image_embedding.norm(dim=-1, keepdim=True)

            # Embed texts helper
            def embed_texts(texts):
                tokens = tokenizer(texts).to(device)
                with torch.no_grad():
                    vectors = model.encode_text(tokens)
                    vectors /= vectors.norm(dim=-1, keepdim=True)
                return vectors

            # Cosine calculation helper
            def get_similarities(image_emb, text_vectors):
                return (image_emb @ text_vectors.T).squeeze(0).tolist()

        else:
            # Fallback to HuggingFace transformers
            import torch
            from transformers import CLIPModel, CLIPProcessor

            model_name = args.model_name if "clip" in args.model_name else "openai/clip-vit-base-patch32"
            model = CLIPModel.from_pretrained(model_name).to(device)
            processor = CLIPProcessor.from_pretrained(model_name)
            model.eval()

            # Encode image
            image_inputs = processor(images=image, return_tensors="pt").to(device)
            with torch.no_grad():
                image_embedding = model.get_image_features(**image_inputs)
                image_embedding /= image_embedding.norm(p=2, dim=-1, keepdim=True)

            # Embed texts helper
            def embed_texts(texts):
                encoded = processor(text=texts, return_tensors="pt", padding=True, truncation=True).to(device)
                with torch.no_grad():
                    vectors = model.get_text_features(**encoded)
                    vectors /= vectors.norm(p=2, dim=-1, keepdim=True)
                return vectors

            # Cosine calculation helper
            def get_similarities(image_emb, text_vectors):
                return torch.matmul(image_emb, text_vectors.T).squeeze(0).tolist()

        # Compute embedding similarity values
        pos_vectors = embed_texts(positives)
        neg_vectors = embed_texts(negatives)
        bg_vectors = embed_texts(BACKGROUND_PROMPTS)

        positive_values = get_similarities(image_embedding, pos_vectors)
        if isinstance(positive_values, float):
            positive_values = [positive_values]
            
        negative_values = get_similarities(image_embedding, neg_vectors)
        if isinstance(negative_values, float):
            negative_values = [negative_values]
            
        background_values = get_similarities(image_embedding, bg_vectors)
        if isinstance(background_values, float):
            background_values = [background_values]

        positive_score = mean(positive_values)
        negative_score = max(negative_values) if negative_values else 0.0
        margin_score = positive_score - negative_score
        
        background_sigma = max(stddev(background_values), 1e-6)
        background_z_score = (positive_score - mean(background_values)) / background_sigma

        # Evaluate captions if provided
        caption_theme_score = None
        if args.generated_caption.strip():
            caption_vector = embed_texts([args.generated_caption.strip()])
            theme_vector = embed_texts(positives)
            caption_theme_similarities = get_similarities(caption_vector, theme_vector)
            if isinstance(caption_theme_similarities, float):
                caption_theme_similarities = [caption_theme_similarities]
            caption_theme_score = mean(caption_theme_similarities)

        if caption_theme_score is None:
            weights = {"positive": 2 / 3, "caption": 0.0, "margin": 1 / 3}
        else:
            weights = {"positive": 0.50, "caption": 0.25, "margin": 0.25}

        # Weighted raw ensembled score
        final_score = (
            weights["positive"] * positive_score
            + weights["caption"] * (caption_theme_score or 0.0)
            + weights["margin"] * margin_score
        )

        # Linear Calibration Math
        if final_score <= args.raw_min:
            calibrated_score = 0.0
        elif final_score >= args.raw_max:
            calibrated_score = 1.0
        else:
            calibrated_score = (final_score - args.raw_min) / (args.raw_max - args.raw_min)

        display_score = round(calibrated_score * 100)

        # Decision threshold boundary mapping
        if calibrated_score >= args.threshold_accept:
            status = "accepted"
            threshold_used = args.threshold_accept
        elif calibrated_score < args.threshold_reject:
            status = "rejected"
            threshold_used = args.threshold_reject
        else:
            status = "needs_review"
            threshold_used = args.threshold_accept

        # Output payload
        print(json.dumps({
            "rawScore": round(final_score, 6),
            "finalScore": round(final_score, 6),
            "displayScore": display_score,
            "status": status,
            "thresholdUsed": threshold_used,
            "positiveSimilarity": round(positive_score, 6),
            "negativeSimilarity": round(negative_score, 6),
            "marginScore": round(margin_score, 6),
            "backgroundZScore": round(background_z_score, 4),
            "captionThemeSimilarity": None if caption_theme_score is None else round(caption_theme_score, 6),
            "openClipModel": args.model_name,
            "positivePromptCount": len(positives),
            "negativePromptCount": len(negatives),
            "scoreWeights": weights,
            "detectedConcepts": positives[:2] + negatives[:2],
            "interpretationType": "literal",
            "explanation": (
                f"Accepted candidate: calibrated score {display_score}% (raw {final_score:.3f}) met the accept threshold of {args.threshold_accept:.2f}."
                if status == "accepted"
                else f"Rejected: calibrated score {display_score}% (raw {final_score:.3f}) was below the reject threshold of {args.threshold_reject:.2f}."
                if status == "rejected"
                else f"Borderline: calibrated score {display_score}% (raw {final_score:.3f}) falls inside the human-review buffer."
            ),
        }, indent=2))
    except Exception as error:
        print(json.dumps({"error": True, "message": str(error)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
