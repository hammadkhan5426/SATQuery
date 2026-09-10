import io

from fastapi.testclient import TestClient


def _upload_image(client: TestClient, filename: str) -> int:
    """Helper to upload a throwaway image and return its ID."""
    res = client.post(
        "/images/",
        files={"file": (filename, io.BytesIO(b"data"), "image/png")},
    )
    return res.json()["id"]


def test_create_image_pair_success(client: TestClient):
    """Test creating an image pair with two valid image IDs returns 201."""
    before_id = _upload_image(client, "before.png")
    after_id = _upload_image(client, "after.png")

    response = client.post(
        "/image-pairs/",
        json={"before_image_id": before_id, "after_image_id": after_id, "label": "Test Pair"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["before_image_id"] == before_id
    assert data["after_image_id"] == after_id
    assert data["label"] == "Test Pair"


def test_create_image_pair_invalid_before_id(client: TestClient):
    """Test creating a pair with a non-existent before_image_id returns 404."""
    after_id = _upload_image(client, "after.png")

    response = client.post(
        "/image-pairs/",
        json={"before_image_id": 99999, "after_image_id": after_id},
    )
    assert response.status_code == 404


def test_create_image_pair_invalid_after_id(client: TestClient):
    """Test creating a pair with a non-existent after_image_id returns 404."""
    before_id = _upload_image(client, "before.png")

    response = client.post(
        "/image-pairs/",
        json={"before_image_id": before_id, "after_image_id": 99999},
    )
    assert response.status_code == 404


def test_list_image_pairs(client: TestClient):
    """Test listing image pairs returns all created pairs."""
    b1, a1 = _upload_image(client, "b1.png"), _upload_image(client, "a1.png")
    client.post("/image-pairs/", json={"before_image_id": b1, "after_image_id": a1})

    response = client.get("/image-pairs/")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_image_pair_by_id(client: TestClient):
    """Test retrieving a single image pair by ID and handling 404 for missing IDs."""
    b1, a1 = _upload_image(client, "b1.png"), _upload_image(client, "a1.png")
    create_res = client.post("/image-pairs/", json={"before_image_id": b1, "after_image_id": a1})
    pair_id = create_res.json()["id"]

    get_res = client.get(f"/image-pairs/{pair_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == pair_id

    missing_res = client.get("/image-pairs/99999")
    assert missing_res.status_code == 404


def test_delete_image_pair(client: TestClient):
    """Test deleting an image pair returns 204, and the underlying images still exist."""
    b1, a1 = _upload_image(client, "b1.png"), _upload_image(client, "a1.png")
    create_res = client.post("/image-pairs/", json={"before_image_id": b1, "after_image_id": a1})
    pair_id = create_res.json()["id"]

    delete_res = client.delete(f"/image-pairs/{pair_id}")
    assert delete_res.status_code == 204

    get_pair_res = client.get(f"/image-pairs/{pair_id}")
    assert get_pair_res.status_code == 404

    # Confirm the underlying images were NOT deleted, only the pairing
    get_image_res = client.get(f"/images/{b1}")
    assert get_image_res.status_code == 200
