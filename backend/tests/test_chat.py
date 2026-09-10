from fastapi.testclient import TestClient


def test_create_session_success(client: TestClient):
    """Test creating a chat session returns 201 with correct fields."""
    response = client.post("/sessions/", json={"title": "Port Expansion Bi-Temporal"})
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Port Expansion Bi-Temporal"
    assert "id" in data
    assert "created_at" in data


def test_create_session_invalid_title(client: TestClient):
    """Test creating a session with an empty title returns 422."""
    response = client.post("/sessions/", json={"title": ""})
    assert response.status_code == 422


def test_list_sessions(client: TestClient):
    """Test listing sessions returns all created sessions, most recent first."""
    client.post("/sessions/", json={"title": "First Session"})
    client.post("/sessions/", json={"title": "Second Session"})

    response = client.get("/sessions/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Second Session"


def test_get_session_by_id(client: TestClient):
    """Test retrieving a session by ID and handling 404 for missing IDs."""
    create_res = client.post("/sessions/", json={"title": "Test Session"})
    session_id = create_res.json()["id"]

    get_res = client.get(f"/sessions/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Test Session"

    missing_res = client.get("/sessions/99999")
    assert missing_res.status_code == 404


def test_add_and_list_messages(client: TestClient):
    """Test adding messages to a session and listing them back in order."""
    session_res = client.post("/sessions/", json={"title": "Chat Test"})
    session_id = session_res.json()["id"]

    msg1 = client.post(
        f"/sessions/{session_id}/messages",
        json={"sender": "user", "content": "Has urban development increased?"},
    )
    assert msg1.status_code == 201

    msg2 = client.post(
        f"/sessions/{session_id}/messages",
        json={"sender": "assistant", "content": "Yes, +18.4m elevation delta detected."},
    )
    assert msg2.status_code == 201

    list_res = client.get(f"/sessions/{session_id}/messages")
    assert list_res.status_code == 200
    data = list_res.json()
    assert len(data) == 2
    assert data[0]["sender"] == "user"
    assert data[1]["sender"] == "assistant"


def test_add_message_invalid_sender(client: TestClient):
    """Test adding a message with an invalid sender value returns 422."""
    session_res = client.post("/sessions/", json={"title": "Invalid Sender Test"})
    session_id = session_res.json()["id"]

    response = client.post(
        f"/sessions/{session_id}/messages",
        json={"sender": "robot", "content": "test"},
    )
    assert response.status_code == 422


def test_add_message_to_nonexistent_session(client: TestClient):
    """Test adding a message to a non-existent session returns 404."""
    response = client.post(
        "/sessions/99999/messages",
        json={"sender": "user", "content": "test"},
    )
    assert response.status_code == 404


def test_delete_session_cascades_messages(client: TestClient):
    """Test deleting a session also deletes its messages (cascade), and 404s afterward."""
    session_res = client.post("/sessions/", json={"title": "To Delete"})
    session_id = session_res.json()["id"]

    client.post(
        f"/sessions/{session_id}/messages",
        json={"sender": "user", "content": "test message"},
    )

    delete_res = client.delete(f"/sessions/{session_id}")
    assert delete_res.status_code == 204

    get_res = client.get(f"/sessions/{session_id}")
    assert get_res.status_code == 404

    delete_missing = client.delete(f"/sessions/{session_id}")
    assert delete_missing.status_code == 404
