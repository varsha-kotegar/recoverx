from pathlib import Path

def test_valid_backup_integrity_verification(client, test_env_dir):
    sample_dir = test_env_dir["sample_dir"]

    # Create backup
    resp = client.post("/api/backups", json={"source_path": str(sample_dir), "label": "Integrity Test Valid"})
    backup_id = resp.json()["id"]

    # Verify integrity
    verify_resp = client.post(f"/api/backups/{backup_id}/verify")
    assert verify_resp.status_code == 200
    vdata = verify_resp.json()
    assert vdata["verification_status"] == "VERIFIED"
    assert vdata["archive_checksum_match"] is True
    assert vdata["manifest_checksum_match"] is True
    assert len(vdata["corrupted_files"]) == 0

def test_corrupted_backup_integrity_detection(client, test_env_dir):
    sample_dir = test_env_dir["sample_dir"]

    # 1. Create backup
    resp = client.post("/api/backups", json={"source_path": str(sample_dir), "label": "Integrity Test Corrupt"})
    backup_id = resp.json()["id"]
    archive_path = Path(resp.json()["archive_path"])

    # 2. Artificially tamper with the archive file on disk (flip bytes / append corrupted data)
    with open(archive_path, "ab") as f:
        f.write(b"CORRUPTED_BYTE_TAMPERING_FOR_SECURITY_TEST")

    # 3. Run verification
    verify_resp = client.post(f"/api/backups/{backup_id}/verify")
    assert verify_resp.status_code == 200
    vdata = verify_resp.json()
    assert vdata["verification_status"] == "CORRUPTED"
    assert vdata["archive_checksum_match"] is False

    # 4. Verify that an incident was generated for this corruption
    inc_resp = client.get("/api/incidents?category=integrity")
    assert inc_resp.status_code == 200
    inc_list = inc_resp.json()["incidents"]
    assert any("Integrity" in i["title"] for i in inc_list)
