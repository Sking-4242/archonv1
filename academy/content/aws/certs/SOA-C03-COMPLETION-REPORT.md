# SOA-C03 (AWS Certified CloudOps Engineer – Associate) — Completion Report

**Goal:** Build the CloudOps cert lesson path, using the SAA lessons as the model.

**Result:** COMPLETE. 9 cert-specific lessons across all five SOA-C03 domains plus an exam-strategy capstone, wired into a full five-domain manifest. PASS on structure and resolution.

---

## Approach (SAA model)

CloudOps (SOA-C03) overlaps heavily with the general curriculum — it covers the same services as the architecture path but from an **operate / monitor / remediate / troubleshoot** angle. So, exactly like the SAA cert build, most content is reused from shared library lessons and the cert-specific lessons add the operational/troubleshooting layer the architecture-focused lessons don't emphasize. The lessons follow the same house format and length as the SAA cert lessons (Overview → Core Concepts → Configuration Reference → How to Decide → How This Connects → Exam Traps → Summary → Examples → Think About It → Quick Check → What's Next; 1,761–1,922 words).

The blueprint was pulled in full from the official guide: 5 domains weighted **22/22/22/16/18**, 65 questions (50 scored), pass **720**, multiple-choice and multiple-response only.

---

## The 9 cert-specific lessons

| # | Lesson | Domain / tasks |
|---|--------|----------------|
| 1 | CloudWatch Operations: Metrics, Alarms, Dashboards, and the Agent | D1 (1.1) |
| 2 | Automation and Remediation: Systems Manager and EventBridge | D1 (1.2) + D3 (3.2) |
| 3 | Performance Optimization and Troubleshooting | D1 (1.3) |
| 4 | Scaling and High-Availability Operations | D2 (2.1, 2.2) |
| 5 | Backup, Restore, and Disaster Recovery Operations | D2 (2.3) |
| 6 | Infrastructure as Code Operations: CloudFormation, StackSets, Troubleshooting | D3 (3.1) |
| 7 | Operational Security and Compliance | D4 (4.1, 4.2) |
| 8 | Network Operations and Troubleshooting | D5 (5.1, 5.2, 5.3) |
| 9 | SOA-C03 Exam Strategy and Question Patterns | capstone |

The operational/troubleshooting focus is deliberate: lessons drill the diagnostic chains (connectivity SG→NACL→route→gateway, missing-metric default-vs-agent, deployment first-stack-event, access-denied grant→cap→deny→condition) that dominate this exam, and the default-vs-configured facts (CloudWatch agent for memory/disk, stateless NACLs, gp2 IOPS-by-size, RDS snapshot restore creates a new instance).

---

## Manifest & resolution — PASS

`SOA-C03.json` replaces the placeholder with a full five-domain manifest: weights **22/22/22/16/18 (= 100)**, all 13 task statements mapped, the 9 cert-specific lessons plus **19 shared lessons** referenced as `supporting` prerequisites — all references resolve. The capstone is published-but-unreferenced (renders in the Capstone section). Question bank pointed at `questions/aws-soa`. `coverage.cert_specific_needed` = 0.

A key detail captured correctly: SOA-C03 is the **CloudOps Engineer** rename of SysOps, dropped the SOA-C02 hands-on **exam labs**, and moved cost/TCO/billing **out of scope** — the lessons and capstone reflect all three changes. (The `questions/aws-soa` bank was already re-mapped from the retired SOA-C02 to SOA-C03 during the earlier practice-test QA.)

---

## Structural QA — PASS

All 9 lessons: valid frontmatter, single H1, all 11 house-style sections, balanced code fences, Quick Check with answer key, 1,500–2,500 words.

## Follow-ups

1. **Re-seed required:** run `python seed_library.py` so the 9 SOA-C03 lessons load into the DB and the track resolves at runtime.
2. **Question bank weighting:** `questions/aws-soa` (212 active SOA-C03 questions) should be verified/balanced to the 22/22/22/16/18 split.
3. **Sandbox caveat:** as in prior sessions, verify locally with a quick `python -c "import json; json.load(open('SOA-C03.json'))"` and by opening the track in the app — resolution was verified independently (9/9 cert lessons, 19/19 shared refs, weights = 100).
