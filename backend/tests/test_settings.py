def test_settings_retrieval_and_update(client):
    # 1. Get initial settings
    get_resp = client.get("/api/settings")
    assert get_resp.status_code == 200
    current_settings = get_resp.json()
    assert "cpu_warning_threshold" in current_settings

    # 2. Update settings
    updated_payload = dict(current_settings)
    updated_payload["cpu_warning_threshold"] = 70.0
    updated_payload["cpu_critical_threshold"] = 88.0

    put_resp = client.put("/api/settings", json=updated_payload)
    assert put_resp.status_code == 200
    assert put_resp.json()["success"] is True
    assert put_resp.json()["settings"]["cpu_warning_threshold"] == 70.0

    # 3. Verify validation error when warning >= critical
    invalid_payload = dict(current_settings)
    invalid_payload["cpu_warning_threshold"] = 95.0
    invalid_payload["cpu_critical_threshold"] = 80.0

    err_resp = client.put("/api/settings", json=invalid_payload)
    assert err_resp.status_code == 400
