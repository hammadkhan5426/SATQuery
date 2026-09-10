import io

from fastapi.testclient import TestClient


def test_upload_image_success(client: TestClient):
    """Test uploading a valid PNG image returns 201 with correct metadata."""
    file_content = b"fake png content"
    response = client.post(
        "/images/",
        files={"file": ("test.png", io.BytesIO(file_content), "image/png")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "test.png"
    assert data["content_type"] == "image/png"
    assert data["file_size_bytes"] == len(file_content)
    assert data["satellite_id"] is None


def test_upload_image_invalid_content_type(client: TestClient):
    """Test uploading a disallowed file type returns 400."""
    response = client.post(
        "/images/",
        files={"file": ("test.txt", io.BytesIO(b"not an image"), "text/plain")},
    )
    assert response.status_code == 400


def test_upload_image_with_sensor_and_modality(client: TestClient):
    """Test uploading with sensor/modality query params stores them correctly."""
    response = client.post(
        "/images/?sensor=Sentinel-2&modality=Optical",
        files={"file": ("labeled.png", io.BytesIO(b"data"), "image/png")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["sensor"] == "Sentinel-2"
    assert data["modality"] == "Optical"


def test_upload_image_linked_to_satellite(client: TestClient):
    """Test uploading an image linked to an existing satellite_id."""
    sat_res = client.post("/satellites/", json={"name": "ISS", "norad_id": 25544})
    sat_id = sat_res.json()["id"]

    response = client.post(
        f"/images/?satellite_id={sat_id}",
        files={"file": ("linked.png", io.BytesIO(b"data"), "image/png")},
    )
    assert response.status_code == 201
    assert response.json()["satellite_id"] == sat_id


def test_upload_image_invalid_satellite_id(client: TestClient):
    """Test uploading with a non-existent satellite_id returns 404."""
    response = client.post(
        "/images/?satellite_id=99999",
        files={"file": ("orphan.png", io.BytesIO(b"data"), "image/png")},
    )
    assert response.status_code == 404

def test_list_images(client: TestClient):
    """Test listing images returns all uploaded images."""
    client.post("/images/", files={"file": ("a.png", io.BytesIO(b"1"), "image/png")})
    client.post("/images/", files={"file": ("b.png", io.BytesIO(b"2"), "image/png")})

    response = client.get("/images/")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_images_filtered_by_satellite_id(client: TestClient):
    """Test that filtering images by satellite_id only returns linked images."""
    sat_res = client.post("/satellites/", json={"name": "Hubble", "norad_id": 20580})
    sat_id = sat_res.json()["id"]

    client.post(f"/images/?satellite_id={sat_id}", files={"file": ("linked.png", io.BytesIO(b"1"), "image/png")})
    client.post("/images/", files={"file": ("unlinked.png", io.BytesIO(b"2"), "image/png")})

    response = client.get(f"/images/?satellite_id={sat_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["original_filename"] == "linked.png"


def test_get_image_metadata(client: TestClient):
    """Test retrieving metadata for an existing and non-existent image."""
    create_res = client.post("/images/", files={"file": ("meta.png", io.BytesIO(b"1"), "image/png")})
    image_id = create_res.json()["id"]

    get_res = client.get(f"/images/{image_id}")
    assert get_res.status_code == 200
    assert get_res.json()["original_filename"] == "meta.png"

    missing_res = client.get("/images/99999")
    assert missing_res.status_code == 404


def test_download_image_file(client: TestClient):
    """Test downloading the actual file content matches what was uploaded."""
    original_bytes = b"real file content here"
    create_res = client.post(
        "/images/",
        files={"file": ("download.png", io.BytesIO(original_bytes), "image/png")},
    )
    image_id = create_res.json()["id"]

    file_res = client.get(f"/images/{image_id}/file")
    assert file_res.status_code == 200
    assert file_res.content == original_bytes

    missing_res = client.get("/images/99999/file")
    assert missing_res.status_code == 404
