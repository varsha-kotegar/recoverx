import hashlib
from pathlib import Path
from typing import Union

def calculate_sha256_file(filepath: Union[str, Path], chunk_size: int = 65536) -> str:
    """Calculate SHA-256 checksum of a file on disk."""
    path = Path(filepath)
    if not path.is_file():
        raise FileNotFoundError(f"File not found for hash calculation: {filepath}")
    
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(chunk_size):
            sha256.update(chunk)
    return sha256.hexdigest()

def calculate_sha256_bytes(data: bytes) -> str:
    """Calculate SHA-256 checksum of bytes in memory."""
    return hashlib.sha256(data).hexdigest()
