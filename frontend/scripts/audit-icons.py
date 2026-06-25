import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def palette_types(path):
    txt = path.read_text(encoding="utf-8")
    return re.findall(r'type:\s*"([^"]+)"', txt)

def icon_keys(dirpath):
    return {p.stem for p in dirpath.glob("*.svg")}

from importlib.util import spec_from_loader, module_from_spec
# read serviceIcons aliases manually
aliases = {
    "kms": "kms_key",
    "secrets_manager": "secretsmanager",
    "generic_tf": "cloudformation",
    "terraform_module": "cloudformation",
    "security_group": "shield",
    "ses": "sns",
    "network_firewall": "waf",
    "memorydb": "elasticache",
}

def resolve(t, icons):
    key = aliases.get(t, t)
    return key if key in icons else None

palettes = {
    "aws": (ROOT / "src/components/canvas/palette.js", ROOT / "src/assets/icons/aws"),
    "azure": (ROOT / "src/utils/azurePalette.js", ROOT / "src/assets/icons/azure"),
    "gcp": (ROOT / "src/utils/gcpPalette.js", ROOT / "src/assets/icons/gcp"),
}

for name, (pal_path, icon_dir) in palettes.items():
    types = palette_types(pal_path)
    icons = icon_keys(icon_dir)
    missing = [t for t in types if not resolve(t, icons)]
    print(f"\n{name.upper()}: {len(types)} palette types, {len(icons)} icons, {len(missing)} unresolved")
    for t in missing:
        print(f"  - {t}")
