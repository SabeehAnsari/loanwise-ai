"""Download the HMDA extracts and pin them with SHA-256 checksums.

First run records each file's checksum in data/hmda/manifest.json (committed).
Later runs verify the local files against it, so every result is traceable to
exact input bytes.
"""
import hashlib
import json
import sys
import urllib.parse
import urllib.request

from . import config


def sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def url_for(year: int, state: str = config.STATE) -> str:
    return f"{config.API_CSV}?{urllib.parse.urlencode({'years': year, 'states': state, **config.QUERY})}"


def ensure(extracts=tuple(config.EXTRACTS)) -> dict:
    manifest = json.loads(config.MANIFEST.read_text()) if config.MANIFEST.exists() else {"files": {}}
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    for year, state in extracts:
        path = config.raw_path(year, state)
        url = url_for(year, state)
        if not path.exists():
            print(f"Downloading {state} {year} from {url}", file=sys.stderr)
            part = path.with_suffix(".part")
            urllib.request.urlretrieve(url, part)  # follows the API's redirect to the file host
            part.replace(path)                     # only a complete download gets the real name
        digest = sha256(path)
        entry = manifest["files"].get(path.name)
        if entry and entry["sha256"] != digest:
            raise RuntimeError(f"{path.name} does not match the manifest checksum; delete it and re-download.")
        manifest["files"][path.name] = {"year": year, "state": state, "url": url, "bytes": path.stat().st_size, "sha256": digest}
    manifest["source"] = "FFIEC HMDA Data Browser (public LAR, snapshot via data-browser-api)"
    config.MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    print(json.dumps(ensure(), indent=2))
