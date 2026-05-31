import pytest

from app.services.practice_test_service import (
    build_feedback,
    can_access_test,
    grade_attempt,
    normalize_options,
    normalize_question,
    questions_by_ids,
    score_answer,
)


def test_score_single_correct():
    q = {"question_type": "single", "correct": "B"}
    assert score_answer(q, "B") is True
    assert score_answer(q, "A") is False


def test_score_multiple_all_or_nothing():
    q = {"question_type": "multiple", "correct": ["B", "D"]}
    assert score_answer(q, ["B", "D"]) is True
    assert score_answer(q, ["D", "B"]) is True
    assert score_answer(q, ["B"]) is False
    assert score_answer(q, ["B", "C"]) is False


def test_build_feedback_includes_explanation():
    q = {
        "question_type": "single",
        "correct": "C",
        "explanation": "Because elasticity.",
        "distractors": {"A": "Wrong A", "C": None},
    }
    feedback = build_feedback(q, "C")
    assert feedback["correct"] is True
    assert feedback["explanation"] == "Because elasticity."


def test_grade_attempt_domain_breakdown():
    questions = [
        {
            "id": "q1",
            "domain": "Cloud Concepts",
            "domain_index": 1,
            "question_type": "single",
            "correct": "A",
            "module_ref": "mod-1",
        },
        {
            "id": "q2",
            "domain": "Cloud Concepts",
            "domain_index": 1,
            "question_type": "single",
            "correct": "B",
            "module_ref": "mod-1",
        },
        {
            "id": "q3",
            "domain": "Security and Compliance",
            "domain_index": 2,
            "question_type": "single",
            "correct": "C",
            "module_ref": "mod-2",
        },
    ]
    results = grade_attempt(questions, {"q1": "A", "q2": "A", "q3": "C"}, pass_threshold_pct=70)
    assert results["score"] == 2
    assert results["total"] == 3
    assert len(results["domain_breakdown"]) == 2
    assert results["recommendations"]


@pytest.mark.parametrize(
    "features,cert,test_number,expected",
    [
        ({"academy_all_practice_tests": True}, "aws-cp", 5, True),
        ({"academy_one_practice_test": True}, "aws-cp", 1, True),
        ({"academy_one_practice_test": True}, "aws-cp", 2, False),
        ({}, "aws-cp", 1, False),
    ],
)
def test_can_access_test(features, cert, test_number, expected):
    assert can_access_test(features, cert, test_number) is expected


def test_normalize_options_array_format():
    raw = [
        {"label": "A", "text": "First"},
        {"label": "B", "text": "Second"},
    ]
    assert normalize_options(raw) == {"A": "First", "B": "Second"}


def test_normalize_question_array_options_and_correct():
    raw = {
        "id": "aws-cp-04-t3-001",
        "domain": "4",
        "domain_name": "Billing, Pricing, and Support",
        "type": "single",
        "stem": "TCO question?",
        "options": [{"label": "A", "text": "Wrong"}, {"label": "B", "text": "Right"}],
        "correct": ["B"],
        "active": True,
    }
    q = normalize_question(raw, "aws-cp")
    assert q["options"] == {"A": "Wrong", "B": "Right"}
    assert q["correct"] == "B"
    assert q["question"] == "TCO question?"
    assert q["domain"] == "Billing, Pricing, and Support"
    assert score_answer(q, "B") is True


def test_questions_by_ids_preserves_order():
    questions = [
        {"id": "q1", "test_number": 1, "active": True, "options": {}, "correct": "A"},
        {"id": "q2", "test_number": 1, "active": True, "options": {}, "correct": "B"},
        {"id": "q3", "test_number": 2, "active": True, "options": {}, "correct": "C"},
    ]

    def fake_load(cert: str):
        assert cert == "aws-cp"
        return questions

    import app.services.practice_test_service as svc

    original = svc.load_cert_questions
    svc.load_cert_questions = fake_load
    try:
        result = questions_by_ids("aws-cp", ["q3", "q1"])
        assert [q["id"] for q in result] == ["q3", "q1"]
    finally:
        svc.load_cert_questions = original
