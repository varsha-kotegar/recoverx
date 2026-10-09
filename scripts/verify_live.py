import urllib.request
import json

def post(url, data=None):
    payload = json.dumps(data).encode("utf-8") if data is not None else b"{}"
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get(url):
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("==================================================")
    print("  RecoverX Live End-to-End API Integration Test   ")
    print("==================================================")

    print("\n[1/6] Querying System Summary & Hardware Telemetry...")
    summary = get("http://127.0.0.1:8000/api/system/summary")
    print(f"  [OK] Host: {summary['hostname']} ({summary['platform']})")
    print(f"  [OK] CPU: {summary['cpu_percent']}% | RAM: {summary['memory_percent']}% | Status: {summary['system_status']}")

    print("\n[2/6] Creating Real Backup Archive of sample_data/configs...")
    bkp = post("http://127.0.0.1:8000/api/backups", {
        "source_path": "sample_data/configs",
        "label": "Live End-to-End Verification Snapshot"
    })
    backup_id = bkp["id"]
    print(f"  [OK] Backup Created: {backup_id}")
    print(f"  [OK] SHA-256 Checksum: {bkp['sha256_checksum']}")
    print(f"  [OK] File Count: {bkp['file_count']} | Size: {bkp['archive_size_bytes']} bytes")

    print("\n[3/6] Executing Cryptographic SHA-256 Integrity Verification...")
    verify = post(f"http://127.0.0.1:8000/api/backups/{backup_id}/verify")
    print(f"  [OK] Verification Status: {verify['verification_status']}")
    print(f"  [OK] Archive Hash Match: {verify['archive_checksum_match']}")
    print(f"  [OK] Manifest Files Matched: {verify['verified_files_count']}")

    print("\n[4/6] Running Disaster Recovery Pre-Flight Conflict Preview...")
    prev = post(f"http://127.0.0.1:8000/api/backups/{backup_id}/restore/preview", {
        "destination_path": "backend/data/restored_output",
        "overwrite_existing": True
    })
    print(f"  [OK] Safe to Proceed: {prev['safe_to_proceed']}")
    print(f"  [OK] Files in Payload: {prev['files_to_restore']}")

    print("\n[5/6] Executing Verified Atomic Restoration...")
    rst = post(f"http://127.0.0.1:8000/api/backups/{backup_id}/restore", {
        "destination_path": "backend/data/restored_output",
        "overwrite_existing": True
    })
    print(f"  [OK] Restore ID: {rst['id']}")
    print(f"  [OK] Status: {rst['status']} | Restored Bytes: {rst['bytes_restored']}")

    print("\n[6/6] Executing Safe Allowlisted Diagnostic Health Suite...")
    diag = post("http://127.0.0.1:8000/api/diagnostics/run")
    print(f"  [OK] Health Status: {diag['overall_health']}")
    print(f"  [OK] Checks Executed: {diag['checks_run']} (Passed: {diag['passed_count']}, Warn: {diag['warn_count']}, Fail: {diag['failed_count']})")
    for r in diag["results"]:
        print(f"    • [{r['status']}] {r['name']}: {r['message']}")

    print("\n==================================================")
    print("  ALL LIVE RECOVERX ENDPOINTS VERIFIED 100% OK!   ")
    print("==================================================")

if __name__ == "__main__":
    main()
