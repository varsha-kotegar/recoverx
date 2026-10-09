from backend.app.utils.path_validator import is_safe_archive_entry

def test_path_traversal_backup_rejected(client):
    # Attempt path traversal
    resp = client.post("/api/backups", json={
        "source_path": "../../../../../etc/passwd",
        "label": "Malicious Traversal Test"
    })
    assert resp.status_code in [400, 404]

def test_protected_system_path_rejected(client):
    resp = client.post("/api/backups", json={
        "source_path": "C:\\Windows\\System32",
        "label": "Protected Windows Directory"
    })
    assert resp.status_code in [400, 404]

def test_unsafe_archive_entries_detection():
    assert is_safe_archive_entry("file.txt") is True
    assert is_safe_archive_entry("folder/subfolder/file.json") is True
    
    # Unsafe entries
    assert is_safe_archive_entry("../evil.sh") is False
    assert is_safe_archive_entry("folder/../../evil.sh") is False
    assert is_safe_archive_entry("/etc/shadow") is False
    assert is_safe_archive_entry("C:\\Windows\\win.ini") is False
    assert is_safe_archive_entry("payload\0file.exe") is False
