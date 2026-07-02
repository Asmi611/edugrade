# EduGrade OCR Service

Standalone OCR microservice for EduGrade that transcribes handwritten text
from images and PDFs using a **hybrid pipeline**:

1. **Preprocessing** — grayscale → Otsu threshold → deskew (Hough lines) → denoise
2. **Segmentation** — connected-component line/word cropping
3. **Inference** — [Microsoft TrOCR](https://huggingface.co/microsoft/trocr-large-handwritten) per region with confidence scoring
4. **Postprocessing** — region joining + spell-check via `pyspellchecker`

---

## Quick Start

### Requirements

- Python 3.10+
- [Poppler](https://poppler.freedesktop.org/) (for PDF support via `pdf2image`)
  - **macOS:** `brew install poppler`
  - **Ubuntu/Debian:** `sudo apt-get install poppler-utils`
  - **Windows:** Download from [poppler-windows](http://blog.alivate.com.au/poppler-windows/) and add the `bin/` folder to your `PATH`

### Local Run

```bash
cd ocr_service

# (Recommended) Create a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server on port 8001
uvicorn main:app --host 0.0.0.0 --port 8001
```

### Docker Run

```bash
cd ocr_service

# Build the image
docker build -t edugrade-ocr .

# Run the container
docker run -p 8001:8001 --rm edugrade-ocr
```

---

## API Endpoints

### `GET /health`

Returns `{"status": "ok"}` — use for health checks / readiness probes.

### `POST /extract`

**Request:** `multipart/form-data` with a single field named `file`.

Acceptable file types:

| Format                     | Extensions                         |
|----------------------------|------------------------------------|
| Portable Network Graphics  | `.png`                             |
| JPEG                       | `.jpg`, `.jpeg`                    |
| TIFF                       | `.tiff`, `.tif`                    |
| BMP                        | `.bmp`                             |
| PDF                        | `.pdf` (each page is OCR'd)        |

**Response (JSON):**

```json
{
  "extracted_text": "full transcribed text with spell correction",
  "confidence": 0.9234,
  "page_count": 1,
  "low_confidence_regions": [
    {
      "region": 3,
      "text": "unclearword",
      "confidence": 0.421
    }
  ]
}
```

| Field                    | Type   | Description                                   |
|--------------------------|--------|-----------------------------------------------|
| `extracted_text`         | string | Final transcribed text (all pages joined)     |
| `confidence`             | float  | Average confidence across all regions (0–1)   |
| `page_count`             | int    | Number of pages processed                     |
| `low_confidence_regions` | array  | Regions where confidence < 0.6                |

Each low-confidence entry: `{ "region": <int>, "text": <str>, "confidence": <float> }`.

---

## Testing with `curl`

### Image file
```bash
curl -X POST http://localhost:8001/extract \
  -F "file=@/path/to/handwritten_note.jpg"
```

### PDF file
```bash
curl -X POST http://localhost:8001/extract \
  -F "file=@/path/to/answer_sheet.pdf"
```

### Python (requests)
```python
import requests

with open("test.png", "rb") as f:
    resp = requests.post("http://localhost:8001/extract", files={"file": f})
    print(resp.json()["extracted_text"])
```

---

## Integrating with the Node.js Backend

The EduGrade Express server (`server/index.js`) calls this OCR service via HTTP.

Example Node.js helper:
```javascript
const FormData = require('form-data');
const fs = require('fs');

async function extractText(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const res = await fetch('http://localhost:8001/extract', {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });
  return res.json();
}
```

---

## Notes

- The TrOCR model (`microsoft/trocr-large-handwritten`) is ~1.4 GB and will be
  downloaded from HuggingFace Hub on the first request.
- GPU acceleration (CUDA) is supported automatically if PyTorch detects a GPU.
- Low-confidence regions (`< 0.6`) are flagged in the response but **not** removed
  from the main text — they are included as-is with a flag so the frontend can
  highlight them for manual review.
