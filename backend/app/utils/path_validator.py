import os
from pathlib import Path
from typing import List, Optional
from backend.app.core.config import settings

# Blocklist of sensitive system locations that must NEVER be targeted as restore destinations or unrestricted sources
PROTECTED_SYSTEM_PATHS = [
    r"C:\Windows",
    r"C:\Program Files",
    r"C:\Program Files (x86)",
    r"C:\ProgramData",
    "/etc",
    "/bin",
    "/sbin",
    "/usr",
    "/lib",
    "/lib64",
    "/boot",
    "/sys",
    "/proc",
    "/dev",
    "/root",
]

class SecurityPathError(ValueError):
    """Exception raised when a path fails security and integrity validation."""
    pass

def get_effective_allowed_roots(custom_roots: Optional[List[str]] = None) -> List[Path]:
    """Return a list of resolved, canonical Path objects for permitted directories."""
    roots = custom_roots or settings.ALLOWED_ROOTS
    resolved = []
    for r in roots:
        try:
            p = Path(r).resolve()
            resolved.append(p)
        except Exception:
            continue
    return resolved

def validate_safe_path(target_path_str: str, allowed_roots: Optional[List[str]] = None, must_exist: bool = True) -> Path:
    """
    Validate that target_path_str:
    1. Contains no null bytes or illegal traversal characters.
    2. Resolves strictly inside one of the allowed roots.
    3. Does not match any protected system directories.
    4. If must_exist is True, verifies the path exists on disk.
    """
    if not target_path_str or not isinstance(target_path_str, str):
        raise SecurityPathError("Target path must be a non-empty string.")

    if "\0" in target_path_str:
        raise SecurityPathError("Null bytes detected in path.")

    try:
        raw_path = Path(target_path_str)
        # If path does not exist yet (e.g. creating restore target), resolve its parent or normalized path
        if raw_path.is_absolute():
            resolved = raw_path.resolve()
        else:
            resolved = (settings.BASE_DIR / raw_path).resolve()
    except Exception as e:
        raise SecurityPathError(f"Failed to resolve path '{target_path_str}': {str(e)}")

    # Check against protected system paths
    resolved_str = str(resolved).lower()
    for prot in PROTECTED_SYSTEM_PATHS:
        try:
            prot_resolved = str(Path(prot).resolve()).lower()
            if resolved_str == prot_resolved or resolved_str.startswith(prot_resolved + os.sep):
                raise SecurityPathError(f"Access to protected system location '{prot}' is strictly prohibited.")
        except Exception:
            continue

    # Verify path is inside at least one allowed root
    effective_roots = get_effective_allowed_roots(allowed_roots)
    is_allowed = False
    for root in effective_roots:
        try:
            resolved.relative_to(root)
            is_allowed = True
            break
        except ValueError:
            continue

    if not is_allowed:
        allowed_list_str = ", ".join(str(r) for r in effective_roots)
        raise SecurityPathError(
            f"Path '{resolved}' is outside permitted root directories ({allowed_list_str})."
        )

    if must_exist and not resolved.exists():
        raise FileNotFoundError(f"Path does not exist: '{resolved}'")

    return resolved

def is_safe_archive_entry(entry_name: str) -> bool:
    """
    Check if a filename inside an archive (ZIP entry) is safe.
    Rejects absolute paths, Windows drive letters, null bytes, and path traversal components ('..').
    """
    if not entry_name or "\0" in entry_name:
        return False
    
    # Check for drive letters like C: or / at start
    if entry_name.startswith("/") or entry_name.startswith("\\"):
        return False
    if len(entry_name) >= 2 and entry_name[1] == ":":
        return False
        
    parts = Path(entry_name).parts
    for part in parts:
        if part in ("..", ".", ""):
            if part == "..":
                return False
    return True
