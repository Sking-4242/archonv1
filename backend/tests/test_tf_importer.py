"""Tests for Terraform import — catalog, companions, report, regression corpus."""

import os
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from app.services.tf_import_catalog import (
    ALL_COMPANION_TYPES,
    ImportReport,
    is_companion_type,
    merge_companion_config,
    normalize_registry_source,
    resolve_companion_parent,
)
from app.services.tf_importer import import_terraform, _collect_refs, _CONFIG_SKIP_KEYS

TEST_TF_DIR = Path(__file__).resolve().parents[2] / "test-tf"
CORPUS = [
    "small_company.tf",
    "medium_company.tf",
    "large_company_1.tf",
    "main.tf",
]


def test_companion_catalog_includes_s3_subresources():
    assert "aws_s3_bucket_server_side_encryption_configuration" in ALL_COMPANION_TYPES
    assert is_companion_type("aws_s3_bucket_public_access_block")
    assert not is_companion_type("aws_cloudwatch_metric_alarm", mapped_types=frozenset({
        "aws_cloudwatch_metric_alarm",
    }))


def test_registry_module_normalization():
    assert normalize_registry_source("terraform-aws-modules/vpc/aws") == "terraform-aws-modules/vpc/aws"
    assert normalize_registry_source('terraform-aws-modules/vpc/aws?version=5.0') == "terraform-aws-modules/vpc/aws"


def test_merge_companion_config_nested():
    parent = {"bucket": "demo"}
    merge_companion_config(
        parent,
        "aws_s3_bucket_public_access_block",
        "demo",
        {"block_public_acls": True},
        config_skip_keys=_CONFIG_SKIP_KEYS,
    )
    assert "demo" in parent["_companions"]["aws_s3_bucket_public_access_block"]
    assert parent["_companions"]["aws_s3_bucket_public_access_block"]["demo"]["block_public_acls"] is True


def test_resolve_companion_parent_by_bucket_ref():
    resources = {
        "aws_s3_bucket": {"attachments": {"bucket": "x"}},
        "aws_s3_bucket_server_side_encryption_configuration": {
            "attachments": {"bucket": "${aws_s3_bucket.attachments.id}"},
        },
    }
    parent = resolve_companion_parent(
        "aws_s3_bucket_server_side_encryption_configuration",
        "attachments",
        resources["aws_s3_bucket_server_side_encryption_configuration"]["attachments"],
        resources,
        _collect_refs,
    )
    assert parent == ("aws_s3_bucket", "attachments")


def test_import_kms_key_maps_to_kms_key_type():
    tf = '''
resource "aws_kms_key" "main" {
  description = "demo key"
  enable_key_rotation = true
}
resource "aws_kms_alias" "main" {
  name          = "alias/demo"
  target_key_id = aws_kms_key.main.key_id
}
'''
    result = import_terraform([tf], ["kms.tf"])
    types = [c["type"] for c in result["graph"]["components"]]
    assert types.count("kms_key") == 2
    assert "kms" not in types


def test_import_minimal_vpc_maps_to_typed_component():
    tf = '''
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "demo-vpc" }
}
'''
    result = import_terraform([tf], ["demo.tf"])
    assert "report" in result
    assert result["graph"]["components"][0]["type"] == "vpc"
    assert result["report"]["summary"].get("mapped", 0) >= 1


def test_import_skips_s3_companion_resources():
    tf = '''
resource "aws_s3_bucket" "data" {
  bucket = "example-data"
}
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}
'''
    result = import_terraform([tf], ["data.tf"])
    graph = result["graph"]
    types = [c["type"] for c in graph["components"]]
    assert types.count("s3") == 1
    s3 = next(c for c in graph["components"] if c["type"] == "s3")
    assert "_companions" in s3["config"]
    assert "aws_s3_bucket_server_side_encryption_configuration" in s3["config"]["_companions"]
    assert result["report"]["summary"].get("companion_merged", 0) >= 2


@pytest.mark.parametrize("filename", CORPUS)
def test_corpus_imports_without_quote_bug(filename):
    path = TEST_TF_DIR / filename
    if not path.is_file():
        pytest.skip(f"{filename} not found")

    result = import_terraform([path.read_text(encoding="utf-8")], [filename])
    graph = result["graph"]
    report = result["report"]

    assert graph["components"]
    assert "summary" in report
    assert "entries" in report

    for comp in graph["components"]:
        aws_type = comp.get("awsType", "")
        assert not aws_type.startswith('"'), f"quoted awsType in {filename}: {aws_type}"

    quoted_warnings = [w for w in result["warnings"] if 'Unknown resource type \'"' in w]
    assert not quoted_warnings


@pytest.mark.parametrize("filename", ["small_company.tf", "medium_company.tf"])
def test_corpus_minimal_generic_nodes(filename):
    path = TEST_TF_DIR / filename
    if not path.is_file():
        pytest.skip(f"{filename} not found")

    result = import_terraform([path.read_text(encoding="utf-8")], [filename])
    types = Counter(c["type"] for c in result["graph"]["components"])
    assert types.get("generic_tf", 0) <= 2, f"too many generic nodes in {filename}: {types}"


def test_small_company_has_merged_s3_companions():
    path = TEST_TF_DIR / "small_company.tf"
    if not path.is_file():
        pytest.skip("small_company.tf not found")

    result = import_terraform([path.read_text(encoding="utf-8")], ["small_company.tf"])
    s3 = next(c for c in result["graph"]["components"] if c["type"] == "s3")
    companions = s3["config"].get("_companions", {})
    assert "aws_s3_bucket_server_side_encryption_configuration" in companions
    assert result["report"]["summary"].get("companion_merged", 0) >= 5


def test_module_heavy_imports_single_file():
    path = TEST_TF_DIR / "module_heavy.tf"
    if not path.is_file():
        pytest.skip("module_heavy.tf not found")

    result = import_terraform([path.read_text(encoding="utf-8")], ["module_heavy.tf"])
    graph = result["graph"]
    types = Counter(c["type"] for c in graph["components"])

    assert graph["components"], "module_heavy should produce canvas nodes"
    assert types.get("terraform_module", 0) >= 10, f"expected module placeholders: {types}"
    assert types.get("vpc", 0) >= 1, "registry VPC module should synthesize skeleton nodes"
    assert types.get("eks", 0) >= 1
    assert result["report"]["summary"].get("module_synthesized", 0) >= 5


def test_module_heavy_expands_local_modules_with_upload():
    root = TEST_TF_DIR / "module_heavy.tf"
    mod_dir = TEST_TF_DIR / "modules"
    if not root.is_file() or not mod_dir.is_dir():
        pytest.skip("module_heavy fixture or modules/ not found")

    contents = [root.read_text(encoding="utf-8")]
    filenames = ["module_heavy.tf"]
    for rel in (
        "modules/security/main.tf",
        "modules/monitoring/main.tf",
        "modules/nat_monitor/main.tf",
    ):
        p = TEST_TF_DIR / rel
        if p.is_file():
            contents.append(p.read_text(encoding="utf-8"))
            filenames.append(rel)

    result = import_terraform(contents, filenames)
    summary = result["report"]["summary"]
    assert summary.get("module_expanded", 0) >= 1, summary
    assert len(result["graph"]["components"]) >= 30
