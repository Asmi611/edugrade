"""
EduGrade OCR Microservice
=========================
FastAPI application that exposes two endpoints:

- GET  /health             — health check
- POST /extract            — run OCR on an uploaded image or PDF

Run locally:
    uvicorn main:app --host 0.0.0.0 --port 8001
"""

import io
import os
import tempfile
from typing import List

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

from pipeline import run_ocr

app = FastAPI(
    title="EduGrade OCR Service",
    version="1.0.0",
    description="Hybrid TrOCR + OpenCV handwriting recognition service.",
)


@app.get("/health")
async def health():
    """Simple health-check endpoint."""
    return {"status": "ok"}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    """
    Accept an image (PNG, JPG, TIFF, BMP) or PDF file and run the OCR pipeline.

    Returns:
      {
        "extracted_text": str,
        "confidence": float,
        "page_count": int,
        "low_confidence_regions": [
            {"region": int, "text": str, "confidence": float}
        ]
      }
    """
    if not file.filename:
        raise HTTPException(400, "No file provided.")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Empty file.")

    filename_lower = file.filename.lower()

    # ------------------------------------------------------------------
    # PDF handling — convert each page to an image with pdf2image
    # ------------------------------------------------------------------
    if filename_lower.endswith(".pdf"):
        try:
            from pdf2image import convert_from_bytes
        except ImportError:
            raise HTTPException(500, "pdf2image is not installed.")

        try:
            pil_images = convert_from_bytes(contents, dpi=200)
        except Exception as exc:
            raise HTTPException(400, f"Failed to parse PDF: {exc}")

        if not pil_images:
            raise HTTPException(400, "PDF appears to be empty (no pages).")

        page_count = len(pil_images)
        all_text_parts: List[str] = []
        all_confidences: List[float] = []
        all_low_conf: List[dict] = []
        region_offset = 0

        for page_idx, pil_img in enumerate(pil_images):
            result = run_ocr(pil_img)
            all_text_parts.append(result["extracted_text"])
            all_confidences.append(result["confidence"])
            # Offset region indices so they are unique across pages
            for lcr in result["low_confidence_regions"]:
                lcr["region"] += region_offset
                all_low_conf.append(lcr)
            region_offset += len(result.get("low_confidence_regions", []))

        # Join pages with double newlines
        full_text = "\n\n".join(all_text_parts)
        overall_confidence = (
            sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        )

        return {
            "extracted_text": full_text,
            "confidence": round(overall_confidence, 4),
            "page_count": page_count,
            "low_confidence_regions": all_low_conf,
        }

    # ------------------------------------------------------------------
    # Image handling — single image
    # ------------------------------------------------------------------
    supported_image_extensions = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}
    ext = os.path.splitext(filename_lower)[1]
    if ext not in supported_image_extensions:
        raise HTTPException(
            400,
            f"Unsupported file type '{ext}'. "
            f"Supported: {', '.join(sorted(supported_image_extensions | {'.pdf'}))}",
        )

    try:
        from PIL import Image as PILImage
        pil_img = PILImage.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(400, f"Failed to decode image: {exc}")

    result = run_ocr(pil_img)
    result["page_count"] = 1

    return result
