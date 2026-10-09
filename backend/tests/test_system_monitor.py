def test_system_summary(client):
    response = client.get("/api/system/summary")
    assert response.status_code == 200
    data = response.json()
    assert "hostname" in data
    assert "platform" in data
    assert "cpu_percent" in data
    assert "memory_percent" in data
    assert "disk_percent" in data
    assert "system_status" in data
    assert data["system_status"] in ["healthy", "warning", "critical"]
    assert isinstance(data["status_reasons"], list)

def test_system_metrics_and_history(client):
    # Sample and record metric
    resp = client.get("/api/system/metrics")
    assert resp.status_code == 200
    m = resp.json()
    assert "cpu_percent" in m
    assert "memory_used_mb" in m
    assert "disk_used_gb" in m

    # Fetch history
    history_resp = client.get("/api/system/metrics/history?limit=10")
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert isinstance(history, list)
    assert len(history) >= 1

def test_disks_and_network(client):
    disks_resp = client.get("/api/system/disks")
    assert disks_resp.status_code == 200
    assert isinstance(disks_resp.json(), list)

    net_resp = client.get("/api/system/network")
    assert net_resp.status_code == 200
    assert isinstance(net_resp.json(), list)
