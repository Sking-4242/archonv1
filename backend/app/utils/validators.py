"""
HCL validation utilities.

Validation pipeline (fastest → most thorough):
  1. Regex check — does the text contain any recognisable Terraform block keyword?
  2. Brace-balance check — fast quote-aware scan; catches unclosed blocks before
     we hand the text to the parser.
  3. python-hcl2 parse — full structural parse; catches syntax errors, bad tokens,
     mismatched delimiters, etc.

Each layer returns a human-readable error string so the caller can feed it back
to the LLM for a self-correcting retry.
"""

import io
import re

try:
    import hcl2 as _hcl2  # type: ignore
    _HCL2_AVAILABLE = True
except ImportError:  # pragma: no cover
    _HCL2_AVAILABLE = False

# First HCL block keyword on a line — used to strip leading prose
_HCL_BLOCK_START = re.compile(
    r"^(terraform|provider|variable|resource|data|output|locals|module)\b",
    re.MULTILINE,
)


# ─── Public helpers ────────────────────────────────────────────────────────────

def strip_fences(text: str) -> str:
    """Remove markdown code fences and any leading prose before the first HCL block."""
    text = text.strip()
    # Remove opening code fence (e.g. ```hcl or ```)
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text, flags=re.MULTILINE)
    # Remove closing code fence
    text = re.sub(r"\n?```\s*$", "", text, flags=re.MULTILINE)
    text = text.strip()
    # Strip any prose that appears before the first recognisable HCL block keyword.
    m = _HCL_BLOCK_START.search(text)
    if m and m.start() > 0:
        text = text[m.start():]
    return text.strip()


def validate_scaffold(text: str) -> list[str]:
    """
    Structural validation for deterministic scaffolds.

    Scaffolds intentionally contain # REQUIRED placeholders and sanitized
    canvas-derived strings. They must be brace-balanced and contain Terraform
    blocks, but are not run through python-hcl2 (which is stricter than
    Terraform CLI and rejects many valid placeholder strings).
    """
    if not text or not text.strip():
        return []

    if not re.search(r'\b(terraform|resource)\s*["{]', text):
        return ["Scaffold does not contain a valid Terraform or resource block."]

    balance_error = _check_brace_balance(text)
    if balance_error:
        return [balance_error]

    return []


def validate_hcl(text: str) -> list[str]:
    """
    Return a list of validation error strings for *text*.
    An empty list means the HCL is structurally valid.

    Runs three checks in order:
      1. Presence check (regex)
      2. Brace-balance check
      3. Full hcl2 parse (when python-hcl2 is importable)
    """
    if not text or not text.strip():
        return []

    # 1. Presence check
    if not re.search(r'\b(terraform|resource)\s*["{]', text):
        return ["Output does not contain a valid Terraform or resource block."]

    # 2. Brace-balance check
    balance_error = _check_brace_balance(text)
    if balance_error:
        return [balance_error]

    # 3. Full structural parse via python-hcl2
    if _HCL2_AVAILABLE:
        parse_error = _hcl2_parse(text)
        if parse_error:
            return [parse_error]

    return []


# ─── Internal helpers ──────────────────────────────────────────────────────────

def _strip_hcl_comments(text: str) -> str:
    """Remove # line comments outside double-quoted strings."""
    result: list[str] = []
    in_string = False
    escape_next = False
    i = 0
    while i < len(text):
        ch = text[i]
        if escape_next:
            escape_next = False
            result.append(ch)
            i += 1
            continue
        if ch == "\\" and in_string:
            escape_next = True
            result.append(ch)
            i += 1
            continue
        if ch == '"':
            in_string = not in_string
            result.append(ch)
            i += 1
            continue
        if not in_string and ch == "#":
            while i < len(text) and text[i] != "\n":
                i += 1
            continue
        result.append(ch)
        i += 1
    return "".join(result)


def _check_brace_balance(text: str) -> str | None:
    """
    Quote-aware brace/bracket/paren balance check.

    Returns a human-readable error string if unbalanced, or None if balanced.
    Ignores delimiters inside double-quoted strings and # line comments.
    """
    text = _strip_hcl_comments(text)
    depth_brace = 0
    depth_bracket = 0
    depth_paren = 0
    in_string = False
    escape_next = False

    for ch in text:
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth_brace += 1
        elif ch == "}":
            depth_brace -= 1
            if depth_brace < 0:
                return "Unmatched closing brace '}' — check for extra or misplaced '}'."
        elif ch == "[":
            depth_bracket += 1
        elif ch == "]":
            depth_bracket -= 1
            if depth_bracket < 0:
                return "Unmatched closing bracket ']' — check for extra or misplaced ']'."
        elif ch == "(":
            depth_paren += 1
        elif ch == ")":
            depth_paren -= 1
            if depth_paren < 0:
                return "Unmatched closing parenthesis ')' — check for extra or misplaced ')'."

    if depth_brace != 0:
        return (
            f"Unbalanced braces: {abs(depth_brace)} unclosed '{{' block(s). "
            "Every resource/variable/output block must have a matching closing '}'."
        )
    if depth_bracket != 0:
        return (
            f"Unbalanced brackets: {abs(depth_bracket)} unclosed '[' list(s). "
            "Every '[' must have a matching ']'."
        )
    if depth_paren != 0:
        return (
            f"Unbalanced parentheses: {abs(depth_paren)} unclosed '(' expression(s). "
            "Every '(' must have a matching ')'."
        )
    return None


def _hcl2_parse(text: str) -> str | None:
    """
    Attempt a full python-hcl2 parse of *text*.

    Returns a human-readable error string on failure, or None on success.
    The error includes the raw parser message so the LLM can use it to self-correct.
    """
    try:
        _hcl2.load(io.StringIO(text))
        return None
    except Exception as exc:
        msg = str(exc)
        return (
            f"HCL syntax error (python-hcl2): {msg}. "
            "Fix the syntax and regenerate valid Terraform HCL."
        )
