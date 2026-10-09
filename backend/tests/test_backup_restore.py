from pathlib import Path

def test_backup_creation_and_listing(client, test_env_dir):
    sample_dir = test_env_dir["sample_dir"]

    # 1. Create backup
    resp = client.post("/api/backups", json={
        "source_path": str(sample_dir),
        "label": "Test Suite Backup"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["file_count"] >= 3
    assert data["sha256_checksum"] is not None
    assert data["archive_size_bytes"] > 0
    backup_id = data["id"]

    # 2. Get backup details
    detail_resp = client.get(f"/api/backups/{backup_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == backup_id
    assert detail_resp.json()["manifest"] is not None

    # 3. List backups
    list_resp = client.get("/api/backups")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

def test_restore_workflow(client, test_env_dir):
    sample_dir = test_env_dir["sample_dir"]
    restore_dir = test_env_dir["restore_dir"] / "run_1"

    # Create backup first
    create_resp = client.post("/api/backups", json={
        "source_path": str(sample_dir),
        "label": "Restore Test Source"
    })
    assert create_resp.status_code == 201
    backup_id = create_resp.json()["id"]

    # 1. Preview restore
    prev_resp = client.post(f"/api/backups/{backup_id}/restore/preview", json={
        "destination_path": str(restore_dir),
        "overwrite_existing": False
    })
    assert prev_resp.status_code == 200
    prev_data = prev_resp.json()
    assert prev_data["file_count"] >= 3
    assert prev_data["safe_to_proceed"] is True

    # 2. Execute restore
    rst_resp = client.post(f"/api/backups/{backup_id}/restore", json={
        "destination_path": str(restore_dir),
        "overwrite_existing": True
    })
    assert rst_resp.status_code == 200
    rst_data = rst_resp.json()
    assert rst_data["status"] == "SUCCESS"
    assert rst_data["file_count"] >= 3

    # Check restored files on disk
    assert (restore_dir / "file1.txt").exists()
    assert (restore_dir / "file1.txt").read_text(encoding="utf-8") == "Hello RecoverX Test 1"
    assert (restore_dir / "file2.json").exists()
    assert (restore_dir / "nested" / "nested_file.conf").exists()

    # 3. List restores
    list_rst = client.get("/api/restores")
    assert list_rst.status_code == 200
    assert list_rst.json()["total"] >= 1
