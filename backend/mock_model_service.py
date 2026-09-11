"""
Minimal mock change-detection model service.

Simulates the real ChangeFormer/BIT model service our main backend expects at
http://localhost:8001/analyze. Returns realistic, question-aware fake results
so the full /validate -> /analyze -> store -> retrieve -> geojson pipeline can
be demonstrated end-to-end while a real trained model is being integrated.

Run with: uv run uvicorn mock_model_service:app --port 8001
"""

from fastapi import FastAPI, File, Form, UploadFile

app = FastAPI(title="Mock Change Detection Service")


@app.post("/analyze")
async def analyze(
    before_image: UploadFile = File(...),
    after_image: UploadFile = File(...),
    query: str = Form(...),
):
    query_lower = query.lower()

    # Pick a plausible response based on keywords in the question, so the
    # demo feels responsive rather than always returning the exact same thing.
    if "vegetation" in query_lower or "ndvi" in query_lower:
        return {
            "task": "change_detection",
            "answer": "NDVI decreased from +0.48 to +0.14 (-0.34 delta) across the observed area, indicating vegetation loss.",
            "confidence": 0.89,
            "execution": ["validate_images", "change_detection", "ndvi_analysis"],
            "regions": [
                {
                    "type": "vegetation_loss",
                    "area": 3400.0,
                    "confidence": 0.89,
                    "geojson": {
                        "type": "Polygon",
                        "coordinates": [[[77.05, 28.55], [77.15, 28.55], [77.15, 28.65], [77.05, 28.65], [77.05, 28.55]]],
                    },
                }
            ],
        }
    elif "sar" in query_lower or "subsidence" in query_lower or "radar" in query_lower:
        return {
            "task": "sar_analysis",
            "answer": "SAR interferometric coherence dropped to 0.88 within the excavation area, confirming active ground disturbance.",
            "confidence": 0.85,
            "execution": ["validate_images", "sar_coherence_analysis"],
            "regions": [
                {
                    "type": "ground_disturbance",
                    "area": 890.0,
                    "confidence": 0.85,
                    "geojson": {
                        "type": "Polygon",
                        "coordinates": [[[77.12, 28.60], [77.18, 28.60], [77.18, 28.64], [77.12, 28.64], [77.12, 28.60]]],
                    },
                }
            ],
        }
    else:
        # Default: construction / built-up area change
        return {
            "task": "change_detection",
            "answer": "Built-up area increased by 14.8% across the observed region, consistent with new construction activity.",
            "confidence": 0.91,
            "execution": ["validate_images", "change_detection", "semantic_classification"],
            "regions": [
                {
                    "type": "construction",
                    "area": 1240.0,
                    "confidence": 0.91,
                    "geojson": {
                        "type": "Polygon",
                        "coordinates": [[[77.1, 28.6], [77.2, 28.6], [77.2, 28.7], [77.1, 28.7], [77.1, 28.6]]],
                    },
                },
                {
                    "type": "construction",
                    "area": 640.0,
                    "confidence": 0.87,
                    "geojson": {
                        "type": "Polygon",
                        "coordinates": [[[77.22, 28.61], [77.25, 28.61], [77.25, 28.64], [77.22, 28.64], [77.22, 28.61]]],
                    },
                },
            ],
        }
