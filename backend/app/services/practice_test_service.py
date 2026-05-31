"""Load practice test questions from JSON content and score attempts."""

from __future__ import annotations

import glob
import json
import os
import random
from typing import Any

CONTENT_ROOT = os.environ.get(
    "CONTENT_ROOT",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "academy", "content"),
)

CERT_CATALOG: dict[str, dict[str, Any]] = {
    "aws-cp": {
        "title": "AWS Certified Cloud Practitioner",
        "short_title": "Cloud Practitioner",
        "provider": "aws",
        "tests": 6,
        "pass_threshold_pct": 70,
    },
    "aws-saa": {
        "title": "AWS Certified Solutions Architect – Associate",
        "short_title": "Solutions Architect Associate",
        "provider": "aws",
        "tests": 6,
        "pass_threshold_pct": 72,
    },
    "aws-scs": {
        "title": "AWS Certified Security – Specialty",
        "short_title": "Security Specialty",
        "provider": "aws",
        "tests": 7,
        "pass_threshold_pct": 75,
    },
}

MINUTES_PER_QUESTION = {
    "below": 1.47,
    "at": 1.385,
    "above": 1.28,
}

TEST_DIFFICULTY = {
    1: "below",
    2: "at",
    3: "at",
    4: "at",
    5: "above",
    6: "above",
    7: "at",
}

DOMAIN_INDEX_BY_NAME: dict[str, dict[str, int]] = {
    "aws-cp": {
        "Cloud Concepts": 1,
        "Security and Compliance": 2,
        "Cloud Technology and Services": 3,
        "Billing, Pricing and Support": 4,
        "Billing, Pricing, and Support": 4,
    },
    "aws-saa": {
        "Design Secure Architectures": 1,
        "Design Resilient Architectures": 2,
        "Design High-Performing Architectures": 3,
        "Design Cost-Optimized Architectures": 4,
    },
    "aws-scs": {
        "Threat Detection and Incident Response": 1,
        "Security Logging and Monitoring": 2,
        "Infrastructure Security": 3,
        "Identity and Access Management": 4,
        "Data Protection": 5,
        "Management and Security Governance": 6,
    },
}

DOMAIN_NAMES_BY_INDEX: dict[str, dict[int, str]] = {
    "aws-cp": {
        1: "Cloud Concepts",
        2: "Security and Compliance",
        3: "Cloud Technology and Services",
        4: "Billing, Pricing and Support",
    },
    "aws-saa": {
        1: "Design Secure Architectures",
        2: "Design Resilient Architectures",
        3: "Design High-Performing Architectures",
        4: "Design Cost-Optimized Architectures",
    },
    "aws-scs": {
        1: "Threat Detection and Incident Response",
        2: "Security Logging and Monitoring",
        3: "Infrastructure Security",
        4: "Identity and Access Management",
        5: "Data Protection",
        6: "Management and Security Governance",
    },
}


def normalize_options(raw_options: Any) -> dict[str, str]:
    if isinstance(raw_options, list):
        normalized: dict[str, str] = {}
        for item in raw_options:
            if isinstance(item, dict):
                label = str(item.get("label", "")).strip()
                text = item.get("text", "")
                if label:
                    normalized[label] = str(text)
        return normalized

    if isinstance(raw_options, dict):
        normalized = {}
        for key, value in raw_options.items():
            if isinstance(value, dict):
                normalized[str(key)] = str(value.get("text", value.get("label", "")))
            else:
                normalized[str(key)] = str(value)
        return normalized

    return {}


def normalize_correct(raw_correct: Any, question_type: str) -> Any:
    if question_type == "multiple":
        if isinstance(raw_correct, list):
            return sorted(str(item) for item in raw_correct)
        if isinstance(raw_correct, str):
            return [raw_correct]
        return raw_correct

    if isinstance(raw_correct, list):
        if len(raw_correct) == 1:
            return raw_correct[0]
        if len(raw_correct) > 1:
            return sorted(str(item) for item in raw_correct)
        return None
    return raw_correct


def normalize_question(raw: dict[str, Any], cert: str) -> dict[str, Any]:
    q = dict(raw)
    if not q.get("question") and q.get("stem"):
        q["question"] = q["stem"]
    if not q.get("question_type") and q.get("type"):
        q["question_type"] = q["type"]
    if not q.get("keywords") and q.get("tags"):
        q["keywords"] = q["tags"]
    q.setdefault("cert", cert)
    q.setdefault("question_type", "single")
    q.setdefault("active", True)

    q["options"] = normalize_options(q.get("options"))

    correct = q.get("correct")
    if isinstance(correct, list) and len(correct) > 1:
        q["question_type"] = "multiple"
    q["correct"] = normalize_correct(correct, q.get("question_type", "single"))

    if q.get("domain_name"):
        q["domain"] = q["domain_name"]
    elif isinstance(q.get("domain"), str) and q["domain"].isdigit():
        domain_index = int(q["domain"])
        q["domain_index"] = domain_index
        q["domain"] = DOMAIN_NAMES_BY_INDEX.get(cert, {}).get(domain_index, q["domain"])
    elif isinstance(q.get("domain"), int):
        q["domain_index"] = q["domain"]
        q["domain"] = DOMAIN_NAMES_BY_INDEX.get(cert, {}).get(q["domain"], str(q["domain"]))

    if not q.get("domain_index") and q.get("domain"):
        q["domain_index"] = DOMAIN_INDEX_BY_NAME.get(cert, {}).get(q["domain"], 0)

    return q


def _questions_dir(cert: str) -> str:
    return os.path.join(CONTENT_ROOT, "questions", cert)


def load_cert_questions(cert: str) -> list[dict[str, Any]]:
    directory = _questions_dir(cert)
    if not os.path.isdir(directory):
        return []

    questions: list[dict[str, Any]] = []
    for path in sorted(glob.glob(os.path.join(directory, "*.json"))):
        with open(path, encoding="utf-8") as handle:
            batch = json.load(handle)
        if not isinstance(batch, list):
            continue
        for raw in batch:
            q = normalize_question(raw, cert)
            if q.get("active", True):
                questions.append(q)
    return questions


def load_test_questions(cert: str, test_number: int) -> list[dict[str, Any]]:
    return [q for q in load_cert_questions(cert) if q.get("test_number") == test_number]


def time_limit_seconds(test_number: int, question_count: int) -> int:
    difficulty = TEST_DIFFICULTY.get(test_number, "at")
    minutes = MINUTES_PER_QUESTION[difficulty] * max(question_count, 1)
    return int(minutes * 60)


def sanitize_question(question: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": question["id"],
        "domain": question.get("domain"),
        "domain_index": question.get("domain_index"),
        "question_type": question.get("question_type", "single"),
        "question": question.get("question", ""),
        "options": question.get("options") or {},
    }


def score_answer(question: dict[str, Any], answer: Any) -> bool:
    correct = question.get("correct")
    qtype = question.get("question_type", "single")
    if qtype == "multiple":
        if not isinstance(answer, list):
            return False
        expected = correct if isinstance(correct, list) else [correct]
        return sorted(str(item) for item in answer) == sorted(str(item) for item in expected)

    expected = correct
    if isinstance(expected, list):
        expected = expected[0] if expected else None
    if isinstance(answer, list):
        answer = answer[0] if answer else None
    return answer == expected


def build_feedback(question: dict[str, Any], answer: Any) -> dict[str, Any]:
    correct = score_answer(question, answer)
    return {
        "correct": correct,
        "correct_answer": question.get("correct"),
        "explanation": question.get("explanation"),
        "distractors": question.get("distractors") or {},
    }


def grade_attempt(
    questions: list[dict[str, Any]],
    answers: dict[str, Any],
    *,
    pass_threshold_pct: int = 70,
) -> dict[str, Any]:
    domain_stats: dict[str, dict[str, Any]] = {}
    per_question: list[dict[str, Any]] = []
    score = 0

    for question in questions:
        qid = question["id"]
        answer = answers.get(qid)
        is_correct = score_answer(question, answer) if answer is not None else False
        if is_correct:
            score += 1

        domain = question.get("domain") or "Other"
        bucket = domain_stats.setdefault(
            domain,
            {
                "domain": domain,
                "domain_index": question.get("domain_index"),
                "correct": 0,
                "total": 0,
                "missed_module_refs": set(),
            },
        )
        bucket["total"] += 1
        if is_correct:
            bucket["correct"] += 1
        elif question.get("module_ref"):
            bucket["missed_module_refs"].add(question["module_ref"])

        per_question.append(
            {
                "question_id": qid,
                "correct": is_correct,
                "your_answer": answer,
                "correct_answer": question.get("correct"),
                "explanation": question.get("explanation"),
                "distractors": question.get("distractors") or {},
                "domain": domain,
                "module_ref": question.get("module_ref"),
            }
        )

    total = len(questions)
    pct = round((score / total) * 100) if total else 0

    domain_breakdown = []
    recommendations = []
    for domain, stats in sorted(domain_stats.items(), key=lambda item: item[1].get("domain_index") or 0):
        domain_pct = round((stats["correct"] / stats["total"]) * 100) if stats["total"] else 0
        domain_breakdown.append(
            {
                "domain": stats["domain"],
                "domain_index": stats.get("domain_index"),
                "correct": stats["correct"],
                "total": stats["total"],
                "percent": domain_pct,
            }
        )
        if domain_pct < pass_threshold_pct:
            for module_ref in sorted(stats["missed_module_refs"]):
                recommendations.append(
                    {
                        "domain": stats["domain"],
                        "module_ref": module_ref,
                        "reason": f"Scored {domain_pct}% in {stats['domain']} (below {pass_threshold_pct}%)",
                    }
                )

    return {
        "score": score,
        "total": total,
        "percent": pct,
        "passed": pct >= pass_threshold_pct,
        "domain_breakdown": domain_breakdown,
        "recommendations": recommendations,
        "per_question": per_question,
    }


def list_catalog(cert: str) -> dict[str, Any]:
    meta = CERT_CATALOG.get(cert)
    if not meta:
        raise ValueError(f"Unknown cert: {cert}")

    available_tests: list[dict[str, Any]] = []
    for test_number in range(1, meta["tests"] + 1):
        questions = load_test_questions(cert, test_number)
        if not questions:
            continue
        difficulty = TEST_DIFFICULTY.get(test_number, "at")
        available_tests.append(
            {
                "test_number": test_number,
                "difficulty": difficulty,
                "question_count": len(questions),
                "time_limit_minutes": round(time_limit_seconds(test_number, len(questions)) / 60),
            }
        )

    return {
        "cert": cert,
        **meta,
        "available_tests": available_tests,
    }


def can_access_test(features: dict[str, bool], cert: str, test_number: int) -> bool:
    if features.get("academy_all_practice_tests"):
        return True
    if features.get("academy_one_practice_test") and test_number == 1:
        return True
    return False


def prepare_question_set(cert: str, test_number: int, *, shuffle: bool = True) -> list[dict[str, Any]]:
    questions = load_test_questions(cert, test_number)
    if shuffle:
        questions = list(questions)
        random.shuffle(questions)
    return questions


def questions_by_ids(cert: str, question_ids: list[str]) -> list[dict[str, Any]]:
    lookup = {q["id"]: q for q in load_cert_questions(cert)}
    return [lookup[qid] for qid in question_ids if qid in lookup]
