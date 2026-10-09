def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "RecoverX"
    assert "version" in data

def test_liveness_probe(client):
    response = client.get("/api/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "alive"

def test_readiness_probe(client):
    response = client.get("/api/readyz")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
