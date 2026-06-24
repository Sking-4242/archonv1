"""Audit import results for test-tf corpus."""
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.tf_importer import import_terraform

TEST_DIR = Path(__file__).resolve().parents[2] / "test-tf"

for tf_path in sorted(TEST_DIR.glob("*.tf")):
    result = import_terraform([tf_path.read_text(encoding="utf-8")], [tf_path.name])
    g = result["graph"]
    types = Counter(c["type"] for c in g["components"])
    generic = [c for c in g["components"] if c["type"] == "generic_tf"]
    data_nodes = [c for c in g["components"] if c.get("awsType", "").startswith("data.")]

    print(f"\n{'='*60}")
    print(f"FILE: {tf_path.name}")
    print(f"  components={len(g['components'])} edges={len(g['edges'])} generic={len(generic)} data_nodes={len(data_nodes)}")
    print(f"  summary: {result['report']['summary']}")
    if generic:
        print("  GENERIC:")
        for c in generic[:20]:
            print(f"    - {c.get('awsType')} | {c.get('label')}")
        if len(generic) > 20:
            print(f"    ... +{len(generic)-20} more")
    if data_nodes:
        print("  DATA NODES ON CANVAS:")
        for c in data_nodes[:15]:
            print(f"    - {c.get('awsType')} | {c.get('label')}")
        if len(data_nodes) > 15:
            print(f"    ... +{len(data_nodes)-15} more")
