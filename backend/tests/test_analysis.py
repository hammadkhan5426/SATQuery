import io

from fastapi.testclient import TestClient

from main import app
from core.database import get_db
from models.analysis_result import AnalysisResult


def _upload_image(client: TestClient, filename: str, content_type: str = "image/png", modality: str | None = None) -> int:
    """Helper to upload a throwaway image and return its ID."""
    url = "/images/"
    if modality:
        url += f"?modality={modality}"
    res = client.post(
        url,
        files={"file": (filename, io.BytesIO(b"data"), content_type)},
    )
    return res.json()["id"]


def _create_pair(client: TestClient, before_id: int, after_id: int) -> int:
    """Helper to create an image pair and return its ID."""
    res = client.post(
        "/image-pairs/",
        json={"before_image_id": before_id, "after_image_id": after_id},
    )
    return res.json()["id"]


def test_validate_compatible_images(client: TestClient):
    """Test that two images with matching type/modality are considered compatible."""
    before_id = _upload_image(client, "before.png")
    after_id = _upload_image(client, "after.png")

    response = client.post(
        "/validate",
        json={"before_image_id": before_id, "after_image_id": after_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["compatible"] is True
    assert data["issues"] == []


def test_validate_incompatible_images(client: TestClient):
    """Test that mismatched content type and modality are correctly flagged as incompatible."""
    before_id = _upload_image(client, "sar.tiff", content_type="image/tiff", modality="SAR")
    after_id = _upload_image(client, "optical.png", content_type="image/png", modality="Optical")

    response = client.post(
        "/validate",
        json={"before_image_id": before_id, "after_image_id": after_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["compatible"] is False
    assert len(data["issues"]) == 2


def test_validate_nonexistent_image(client: TestClient):
    """Test that validating with a non-existent image ID returns 404."""
    after_id = _upload_image(client, "after.png")
    response = client.post(
        "/validate",
        json={"before_image_id": 99999, "after_image_id": after_id},
    )
    assert response.status_code == 404


def test_analyze_refuses_incompatible_images(client: TestClient):
    """Test that /analyze refuses (rather than crashes or errors) on incompatible images."""
    before_id = _upload_image(client, "sar.tiff", content_type="image/tiff", modality="SAR")
    after_id = _upload_image(client, "optical.png", content_type="image/png", modality="Optical")
    pair_id = _create_pair(client, before_id, after_id)

    response = client.post(
        "/analyze",
        json={"image_pair_id": pair_id, "question": "What changed?"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["task"] == "refused"
    assert data["confidence"] == 0.0
    assert data["regions"] == []
    assert "not compatible" in data["answer"]


def test_analyze_nonexistent_pair(client: TestClient):
    """Test that analyzing a non-existent image pair returns 404."""
    response = client.post(
        "/analyze",
        json={"image_pair_id": 99999, "question": "What changed?"},
    )
    assert response.status_code == 404


def _insert_analysis_with_geojson(client: TestClient, image_pair_id: int) -> int:
    """Insert an AnalysisResult directly with real region/GeoJSON data,
    bypassing /analyze since that needs a real external model service."""
    override_get_db = app.dependency_overrides[get_db]
    db_gen = override_get_db()
    db = next(db_gen)
    try:
        result = AnalysisResult(
            image_pair_id=image_pair_id,
            question="Has construction increased?",
            task="change_detection",
            answer="Built-up area increased by 14.8%.",
            confidence=0.91,
            execution_trace=["validate_images", "change_detection"],
            regions=[
                {
                    "type": "construction",
                    "area": 1240.0,
                    "confidence": 0.91,
                    "geojson": {
                        "type": "Polygon",
                        "coordinates": [[[77.1, 28.6], [77.2, 28.6], [77.2, 28.7], [77.1, 28.7], [77.1, 28.6]]],
                    },
                }
            ],
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result.id
    finally:
        db_gen.close()


def test_get_analysis_by_id(client: TestClient):
    """Test retrieving a stored analysis result with real region data."""
    before_id = _upload_image(client, "before.png")
    after_id = _upload_image(client, "after.png")
    pair_id = _create_pair(client, before_id, after_id)
    analysis_id = _insert_analysis_with_geojson(client, pair_id)

    response = client.get(f"/analysis/{analysis_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["task"] == "change_detection"
    assert len(data["regions"]) == 1
    assert data["regions"][0]["type"] == "construction"


def test_get_analysis_not_found(client: TestClient):
    """Test that retrieving a non-existent analysis returns 404."""
    response = client.get("/analysis/99999")
    assert response.status_code == 404


def test_analysis_geojson_export(client: TestClient):
    """Test that the GeoJSON export endpoint produces a valid FeatureCollection."""
    before_id = _upload_image(client, "before.png")
    after_id = _upload_image(client, "after.png")
    pair_id = _create_pair(client, before_id, after_id)
    analysis_id = _insert_analysis_with_geojson(client, pair_id)

    response = client.get(f"/analysis/{analysis_id}/geojson")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 1
    feature = data["features"][0]
    assert feature["type"] == "Feature"
    assert feature["geometry"]["type"] == "Polygon"
    assert feature["properties"]["type"] == "construction"
    assert feature["properties"]["area"] == 1240.0


def test_analysis_geojson_export_not_found(client: TestClient):
    """Test that exporting GeoJSON for a non-existent analysis returns 404."""
    response = client.get("/analysis/99999/geojson")
    assert response.status_code == 404
