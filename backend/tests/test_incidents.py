def test_incident_lifecycle(client):
    # 1. Simulate an incident
    sim_resp = client.post("/api/demo/simulate-incident", json={
        "incident_type": "cpu_spike",
        "severity": "critical",
        "custom_title": "CPU Overload Incident"
    })
    assert sim_resp.status_code == 200
    incident_id = sim_resp.json()["id"]
    assert sim_resp.json()["status"] == "OPEN"

    # 2. Acknowledge the incident
    ack_resp = client.post(f"/api/incidents/{incident_id}/acknowledge")
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "ACKNOWLEDGED"

    # 3. Resolve the incident
    res_resp = client.post(f"/api/incidents/{incident_id}/resolve", json={
        "resolution_notes": "Identified high-CPU worker thread and tuned concurrency limits."
    })
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "RESOLVED"
    assert res_resp.json()["resolution_notes"] is not None

    # 4. List incidents
    list_resp = client.get("/api/incidents")
    assert list_resp.status_code == 200
    assert list_resp.json()["resolved_count"] >= 1
