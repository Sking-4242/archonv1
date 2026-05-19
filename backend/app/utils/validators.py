import re


def strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n?```\s*$", "", text, flags=re.MULTILINE)
    return text.strip()


def validate_hcl(text: str) -> list[str]:
    if not text or not text.strip():
        return []
    errors = []
    if not re.search(r'\b(terraform|resource)\s*["{]', text):
        errors.append("Output does not contain a valid Terraform or resource block.")
    return errors
