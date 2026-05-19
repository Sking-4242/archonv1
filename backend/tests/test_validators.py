"""Tests for HCL validators and prompt sanitization."""

from app.utils.validators import strip_fences, validate_hcl


class TestStripFences:
    def test_strips_hcl_fence(self):
        raw = "```hcl\nresource \"aws_instance\" \"web\" {}\n```"
        assert strip_fences(raw) == 'resource "aws_instance" "web" {}'

    def test_strips_plain_fence(self):
        raw = "```\nresource \"aws_s3_bucket\" \"b\" {}\n```"
        assert strip_fences(raw) == 'resource "aws_s3_bucket" "b" {}'

    def test_passthrough_no_fence(self):
        raw = 'resource "aws_instance" "web" {}'
        assert strip_fences(raw) == raw

    def test_strips_whitespace(self):
        raw = "  \nresource \"aws_instance\" \"web\" {}\n  "
        assert strip_fences(raw).strip() == 'resource "aws_instance" "web" {}'


class TestValidateHcl:
    def test_valid_hcl_returns_no_errors(self):
        hcl = 'resource "aws_instance" "web" { ami = "ami-123" instance_type = "t3.micro" }'
        errors = validate_hcl(hcl)
        assert errors == []

    def test_empty_string_returns_no_errors(self):
        errors = validate_hcl("")
        assert errors == []

    def test_invalid_hcl_returns_errors(self):
        bad_hcl = "resource { this is not valid hcl !!!"
        errors = validate_hcl(bad_hcl)
        assert isinstance(errors, list)
