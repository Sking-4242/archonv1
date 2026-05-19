"""
Split a single Terraform HCL string into multiple files and package as a ZIP.

Files produced:
  backend.tf   — terraform {} and provider {} blocks
  variables.tf — variable {} blocks
  outputs.tf   — output {} blocks
  main.tf      — everything else (resources, data sources, locals)
"""

import base64
import io
import re
import zipfile

_FILE_MAP = {
    "terraform": "backend.tf",
    "provider": "backend.tf",
    "variable": "variables.tf",
    "output": "outputs.tf",
}
_DEFAULT_FILE = "main.tf"
_BLOCK_START = re.compile(r"^([a-zA-Z_]\w*)")


def _extract_blocks(hcl: str) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    lines = hcl.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue
        m = _BLOCK_START.match(stripped)
        if m and "{" in line:
            block_type = m.group(1)
            depth = line.count("{") - line.count("}")
            block_lines = [line]
            i += 1
            while i < len(lines) and depth > 0:
                ln = lines[i]
                depth += ln.count("{") - ln.count("}")
                block_lines.append(ln)
                i += 1
            blocks.append((block_type, "\n".join(block_lines)))
        else:
            i += 1
    return blocks


def split_hcl(hcl: str) -> dict[str, str]:
    buckets: dict[str, list[str]] = {
        "backend.tf": [],
        "variables.tf": [],
        "outputs.tf": [],
        "main.tf": [],
    }
    for block_type, content in _extract_blocks(hcl):
        dest = _FILE_MAP.get(block_type, _DEFAULT_FILE)
        buckets[dest].append(content)
    return {name: "\n\n".join(blocks) for name, blocks in buckets.items() if blocks}


def make_zip_b64(files: dict[str, str]) -> str:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("ascii")
