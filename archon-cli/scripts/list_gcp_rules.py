"""List GCP validation rule IDs from gcp_validate.py."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from archon_cli.gcp_validate import gcp_rule_ids  # noqa: E402

if __name__ == "__main__":
    ids = sorted(gcp_rule_ids())
    print(len(ids))
    for rid in ids:
        print(rid)
