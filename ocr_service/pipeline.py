"""
EduGrade OCR Pipeline
=====================
Hybrid OCR pipeline that uses **Doctr** (deep learning) as the primary
engine with **Tesseract** as a CPU-friendly fallback.

Strategy:
  1. Doctr OCR (primary)   — deep-learning model, excellent on handwriting
  2. Tesseract OCR (fallback) — if Doctr fails or returns low confidence
  3. Preprocessing (Tesseract path) — grayscale, Otsu threshold, deskew via
     Hough lines (only if angle > 0.5°)

Pipeline:
  1. Preprocessing  — grayscale, Otsu threshold, deskew via Hough
     lines (only if angle > 0.5°)
  2. Tesseract OCR  — single-pass full-page recognition (PSM 6, OEM 3)
  3. Confidence     — derived from Tesseract per-word confidence data
"""

import math
import os
import tempfile
import cv2
import numpy as np
from PIL import Image
import pytesseract

# ---------------------------------------------------------------------------
# Doctr imports — gracefully handle missing install
# ---------------------------------------------------------------------------
try:
    from doctr.io import DocumentFile
    from doctr.models import ocr_predictor
    DOCTR_AVAILABLE = True
    print("[pipeline] Doctr available.")
except Exception as e:
    print(f"[pipeline] Doctr import failed: {e}")
    DOCTR_AVAILABLE = False

# ---------------------------------------------------------------------------
# Tesseract binary path — try common install locations
# ---------------------------------------------------------------------------
_TESSERACT_CMD = None
_CANDIDATE_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    "/usr/bin/tesseract",
    "/usr/local/bin/tesseract",
]

for _path in _CANDIDATE_PATHS:
    if os.path.exists(_path):
        _TESSERACT_CMD = _path
        pytesseract.pytesseract.tesseract_cmd = _path
        break

if _TESSERACT_CMD is None:
    # Try PATH
    import shutil
    _TESSERACT_CMD = shutil.which("tesseract")
    if _TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = _TESSERACT_CMD

if _TESSERACT_CMD:
    print(f"[pipeline] Using Tesseract: {_TESSERACT_CMD}")
else:
    print("[pipeline] WARNING: Tesseract binary not found. OCR will fail.")


# ---------------------------------------------------------------------------
# Preprocessing helpers
# ---------------------------------------------------------------------------

def _to_grayscale(img: np.ndarray) -> np.ndarray:
    """Convert BGR or RGBA to grayscale."""
    if len(img.shape) == 2:
        return img
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def _otsu_threshold(gray: np.ndarray) -> np.ndarray:
    """Apply Otsu's binary threshold (normal, text=black on white)."""
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary


def _deskew(img: np.ndarray) -> np.ndarray:
    """
    Estimate skew angle via Hough Lines and rotate to correct it.
    Only corrects if angle > 0.5 degrees to avoid over-rotating.
    Returns the deskewed (binary) image.
    """
    edges = cv2.Canny(img, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
    if lines is None:
        return img

    angles = []
    for rho, theta in lines[:, 0]:
        angle = math.degrees(theta) - 90
        angles.append(angle)

    median_angle = np.median(angles)

    if abs(median_angle) < 0.5:
        return img

    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    rot_mat = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    rotated = cv2.warpAffine(
        img, rot_mat, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )
    return rotated


# ---------------------------------------------------------------------------
# Tesseract configuration
# ---------------------------------------------------------------------------

_TESS_CONFIG = "--psm 6 --oem 3 -c preserve_interword_spaces=1"
# --psm 6 = assume uniform block of text (best for answer sheets)
# --oem 3 = use LSTM neural net (most accurate)
# preserve_interword_spaces = keep spacing between words


# ---------------------------------------------------------------------------
# Doctr model (singleton, lazy-loaded)
# ---------------------------------------------------------------------------

_doctr_model = None

def _get_doctr_model():
    """Load the Doctr OCR model once and cache it."""
    global _doctr_model
    if _doctr_model is None:
        if not DOCTR_AVAILABLE:
            return None
        print("[pipeline] Loading Doctr model…")
        _doctr_model = ocr_predictor(
            det_arch='db_resnet50',
            reco_arch='crnn_vgg16_bn',
            pretrained=True
        )
        print("[pipeline] Doctr ready.")
    return _doctr_model


def _extract_with_doctr(image_path: str):
    """
    Run Doctr OCR on an image file.

    Returns:
      (extracted_text: str, average_confidence: float)
    """
    model = _get_doctr_model()
    if model is None:
        return None, 0.0

    doc = DocumentFile.from_images(image_path)
    result = model(doc)

    full_text = []
    confidences = []

    for page in result.pages:
        for block in page.blocks:
            for line in block.lines:
                if not line.words:
                    continue
                line_text = ' '.join([word.value for word in line.words])
                line_conf = sum(
                    [word.confidence for word in line.words]
                ) / len(line.words)
                full_text.append(line_text)
                confidences.append(line_conf)

    text = '\n'.join(full_text)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    return text, avg_confidence


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_ocr(pil_image: Image.Image) -> dict:
    """
    Run OCR on a PIL image using a hybrid Doctr + Tesseract pipeline.

    Strategy:
      1. Try Doctr first (more accurate on handwriting).
      2. If Doctr confidence > 0.5, use Doctr result.
      3. Otherwise fall back to Tesseract.
      4. Return results in a consistent format.

    Returns:
      {
        "extracted_text": str,      # Full transcribed text
        "confidence": float,        # Average per-word confidence
        "page_count": 1,            # Always 1 for a single image
        "low_confidence_regions": [ # Words with confidence < 60
          {"region": int, "text": str, "confidence": float}
        ]
      }
    """
    used_doctr = False
    doctr_text = None
    doctr_confidence = 0.0

    # ---------------------------------------------------------------
    # 1. Try Doctr (primary engine — good for handwriting)
    # ---------------------------------------------------------------
    if DOCTR_AVAILABLE:
        try:
            # Save PIL image to a temporary file for Doctr
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                tmp_path = tmp.name
                pil_image.save(tmp_path, format='PNG')

            doctr_text, doctr_confidence = _extract_with_doctr(tmp_path)

            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

            if doctr_text and doctr_confidence > 0.5:
                used_doctr = True
        except Exception as exc:
            print(f"[pipeline] Doctr failed: {exc}")
            # Clean up temp file if it exists
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            doctr_text = None
            doctr_confidence = 0.0

    if used_doctr:
        # Build low-confidence regions from Doctr output (none available per-word)
        confidence = round(doctr_confidence, 4)
        print(f"[pipeline] Used: Doctr, confidence: {confidence:.2f}")
        return {
            "extracted_text": doctr_text,
            "confidence": confidence,
            "page_count": 1,
            "low_confidence_regions": [],
        }

    # ---------------------------------------------------------------
    # 2. Fallback: Tesseract OCR (existing pipeline)
    # ---------------------------------------------------------------
    # PIL → OpenCV BGR → Grayscale
    img = cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2BGR)
    gray = _to_grayscale(img)
    binary = _otsu_threshold(gray)
    deskewed = _deskew(binary)
    clean = deskewed

    # ---------------------------------------------------------------
    # 3. Tesseract OCR — get both full text and per-word data
    # ---------------------------------------------------------------
    extracted_text = pytesseract.image_to_string(clean, config=_TESS_CONFIG).strip()

    # Per-word data for confidence scoring
    try:
        data = pytesseract.image_to_data(
            clean, config=_TESS_CONFIG, output_type=pytesseract.Output.DICT
        )
    except Exception:
        data = None

    # Compute confidence
    confidence = 0.0
    low_conf_regions = []
    if data and "conf" in data:
        conf_values = [c for c in data["conf"] if c != -1]
        if conf_values:
            confidence = sum(conf_values) / len(conf_values) / 100.0

        # Build low-confidence region list
        region_idx = 0
        for i in range(len(data.get("text", []))):
            conf_val = data["conf"][i]
            word = (data["text"][i] or "").strip()
            if word and conf_val != -1 and conf_val < 60:
                low_conf_regions.append({
                    "region": region_idx,
                    "text": word,
                    "confidence": round(conf_val / 100.0, 4),
                })
                region_idx += 1
    else:
        # Fallback: no confidence data — assume decent quality
        confidence = 0.85 if extracted_text else 0.0

    print(f"[pipeline] Used: Tesseract, confidence: {confidence:.2f}")

    return {
        "extracted_text": extracted_text,
        "confidence": round(confidence, 4),
        "page_count": 1,
        "low_confidence_regions": low_conf_regions,
    }
