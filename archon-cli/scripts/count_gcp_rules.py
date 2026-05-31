import re
from pathlib import Path

text = Path(__file__).resolve().parents[1].joinpath("archon_cli/gcp_validate.py").read_text(encoding="utf-8")
ids = set(re.findall(r'_finding\(\s*"(gcp_[^"]+)"', text))
ids |= set(re.findall(r'_sg_finding\(\s*"(gcp_[^"]+)"', text))
ids |= set(re.findall(r'_iam_finding\(\s*"(gcp_[^"]+)"', text))
print("count", len(ids))

from archon_cli.gcp_validate import run_gcp_validation
from archon_cli.validate import Node

n = Node(id="1", type="gcp_gcs", tf_type="", label="bucket", config={"public_access_prevention": "inherited"})
findings = run_gcp_validation([n], [], [], [])
print("sample", len(findings), findings[0].rule_id if findings else "none")
