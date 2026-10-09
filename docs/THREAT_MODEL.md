# RecoverX — Threat Model & Security Architecture

## 1. Security Philosophy & Scope

RecoverX is designed as a **security-conscious educational and operational prototype**. It enforces defensive programming, strict path canonicalization, archive entry sanitization, and cryptographic integrity verification to safeguard local workstations.

> [!WARNING]
> RecoverX is a local-first platform and does not implement multi-user role-based access control (RBAC) or network authentication by default. It MUST NOT be bound directly to public internet interfaces without an authentication reverse proxy or VPN barrier.

---

## 2. Threat Vector Analysis & Mitigations

### Threat 1: Path Traversal Attacks (Directory Escape)
- **Risk**: An attacker supplies relative directory paths (e.g., `../../../../etc/shadow` or `..\..\..\Windows\System32`) to read or write outside designated directories.
- **Mitigation**:
  - `validate_safe_path()` resolves canonical absolute paths using `Path.resolve()`.
  - Path ancestry is checked against configured `ALLOWED_ROOTS` using `relative_to()`.
  - Rejects null bytes (`\0`) and invalid path characters.
  - Denies access to system directory blocklists (`C:\Windows`, `C:\Program Files`, `/etc`, `/boot`, `/sys`, `/proc`, `/dev`, `/root`).

### Threat 2: Malicious Archive Extraction (Zip Slip)
- **Risk**: A crafted ZIP archive contains entry filenames with path traversal prefixes (e.g., `data/../../startup/evil.bat`) attempting to write outside target destination during restore.
- **Mitigation**:
  - `is_safe_archive_entry()` validates every archive entry before extraction.
  - Rejects drive letters (`C:`), absolute root paths (`/` or `\`), null bytes, and traversal components (`..`).
  - Restoration extracts exclusively to an isolated staging directory (`data/restore_staging/stage_<id>`) and copies strictly validated manifest items.

### Threat 3: Recursive Backup Storage Bomb
- **Risk**: Backing up the parent directory containing the backup repository itself, causing exponential file expansion and disk exhaustion.
- **Mitigation**:
  - `BackupService.create_backup()` checks if `settings.BACKUP_DIR` is equal to or a child of the source path.
  - Raises a `SecurityPathError` immediately if a recursive backup loop is attempted.

### Threat 4: Data Corruption & Tampering (Bit-Rot)
- **Risk**: Undetected media degradation or unauthorized file tampering inside backup archives.
- **Mitigation**:
  - Real SHA-256 cryptographic verification over whole archive + individual manifest files.
  - Automated incident creation upon any hash mismatch or CRC corruption.

### Threat 5: Arbitrary Remote Command Execution (RCE)
- **Risk**: Malicious commands injected through diagnostic check parameters.
- **Mitigation**:
  - `DiagnosticService` uses a strictly fixed allowlist of Python native checks (`psutil`, `PRAGMA integrity_check`, filesystem write tests).
  - No user-supplied shell commands are accepted or executed anywhere in the codebase.

---

## 3. Permitted Roots Configuration

Default permitted roots:
```python
ALLOWED_ROOTS = [
    str(BASE_DIR.resolve()),
    str((BASE_DIR / "sample_data").resolve()),
    str(DATA_DIR.resolve()),
]
```
Administrators can configure permitted roots in `Settings` or through the `.env` configuration file.
