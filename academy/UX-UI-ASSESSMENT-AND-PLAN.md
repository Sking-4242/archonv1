# Archon Academy — UX/UI Assessment & Redesign Plan

A full assessment of the current Academy front end (React app in `academy/src`) and a plan to modernize the navigation and experience around what Archon now offers (multi-cloud curricula, five built-out cert paths, domain-weighted study plans, and practice-test banks).

---

## 1. Current state — what's actually there

The student experience is a flat top navigation of **13 tabs** (`AppShell.jsx` → `STUDENT_TABS`), rendered as a single horizontally-scrolling row. Here is every tab, what it renders, and an honest verdict.

| Tab | Route → component | Size | What it does | Verdict |
|-----|-------------------|-----:|--------------|---------|
| **Home** | `/dashboard` → StudentHome | 194 | Dashboard: assignments, classes, join-code | ✅ Keep (enhance) |
| **Classes** | `/classes` → StudentClasses | 205 | Enrolled classes (instructor-led) | ✅ Keep |
| **Assignments** | `/assignments` → StudentAssignments | 162 | Coursework assignments | ✅ Keep |
| **Modules** | `/modules` → StudentModules | 338 | Course modules by provider/cert/difficulty | ⚠️ Overlaps Lessons + Course Library; **stale cert labels** |
| **Lessons** | `/lessons` → StudentLessons | 213 | Flat lesson list by provider, complete/incomplete | ⚠️ Overlaps Modules + Course Library |
| **Components** | `/library` → StudentLibrary | 539 | Catalog of **architecture components** (AWS/Azure/GCP service icons) for the diagram canvas | ⚠️ Mislabeled; belongs *inside the builder*, not top nav |
| **Course Library** | `/course-library` → StudentLibraryBrowser | 505 | Provider → cert → lessons browser (the new cert-centric model) | ✅ Best content browser — promote this |
| **Sandbox** | `/sandbox` → StudentSandbox | 29 | Intro page with "Open Sandbox Canvas" button | 🐞 Button navigates to `/sandbox/canvas`, **which has no route** → bounces to Home |
| **Grades** | `/grades` → StudentGrades | 115 | Grade list | ✅ Keep (fold into coursework) |
| **Practice Tests** | `/practice-tests` → StudentPracticeTests | 207 (+436 runner) | Practice exams from the question banks | ✅ Keep — strong |
| **Tools** | `/tools` → StudentTools | 59 | 4 tool cards, **3 of 4 "Coming Soon"**, and the one "available" card has no working link | ⚠️ Mostly placeholder; overlaps Sandbox |
| **Teams** | `/teams` → StudentTeams | 14 | `<ComingSoon>` stub | ❌ Empty |
| **Announcements** | `/announcements` → StudentAnnouncements | 14 | `<ComingSoon>` stub | ❌ Empty |

Other findings in the code:

- **`StudentDashboard.jsx` (66 lines) is orphaned** — it exists but nothing imports it; the Home route uses `StudentHome`. Dead code.
- **Stale cert metadata.** `StudentModules` hard-codes cert labels with the old slug style (`aws_ccp`, `aws_saa`, …) and still lists **retired certs** (`aws_dbs`, `aws_mls`) — the same ones we removed from `curriculum.json`. The UI hasn't caught up to the cleaned-up cert lineup or the official codes (CLF-C02, SAA-C03, SCS-C03, SOA-C03, AIF-C01, …).
- **Non-functional chrome.** The header notification **bell has no behavior**, and the avatar/name is static (no profile menu — Sign out is a separate button).
- The visual design itself is clean and consistent (Tailwind, good spacing, sensible color use). The problem is **information architecture, not styling**.

Instructor navigation is leaner (8 tabs) and in better shape, though `InstructorTeams` and `InstructorAnnouncements` are also `ComingSoon` stubs (they're not even in the instructor nav, so they're unreachable dead routes).

---

## 2. The core problems (your instinct is right)

**Problem 1 — Three tabs browse the same thing.** *Modules*, *Lessons*, and *Course Library* are three different doorways into the same lesson content, with no clear distinction for the user. This is the single biggest source of "too many tabs that do the same thing."

**Problem 2 — Two different "libraries."** *Components* (`/library`, an architecture-icon catalog for the canvas) and *Course Library* (`/course-library`, the lesson browser) share the word "library" but are unrelated. "Components" is also a poor label for a service catalog.

**Problem 3 — Empty/placeholder tabs.** *Teams* and *Announcements* are `ComingSoon` stubs; *Tools* is 3/4 "Coming Soon" with no working action; *Sandbox* is a thin shell whose only button is broken. Four of thirteen tabs deliver little or nothing.

**Problem 4 — Two tabs for "build/practice hands-on."** *Sandbox* and *Tools* both orbit the diagram canvas, fragmenting one capability across two weak tabs.

**Problem 5 — Flat 13-tab bar.** No grouping, horizontal scroll on smaller screens, and high cognitive load. There's no signal of what matters most.

**Problem 6 — The nav doesn't reflect what Archon now is.** The platform has become **cert-prep-centric** — five fully built cert paths (SAA-C03, AIF-C01, CLF-C02, SCS-C03, SOA-C03) with domain-weighted study plans and matched practice banks across AWS/Azure/GCP. The flat, course-module-era nav buries this. A learner can't easily answer "which cert am I working toward, and how ready am I?"

---

## 3. Proposed information architecture

Collapse 13 student tabs into **4 primary hubs + a profile menu**, organized around the two real ways the platform is used: **self-directed cert prep** and **class-based coursework**.

```
BEFORE (13 flat tabs)
Home · Classes · Assignments · Modules · Lessons · Components ·
Course Library · Sandbox · Grades · Practice Tests · Tools · Teams · Announcements

AFTER (4 hubs + profile menu)
Home · Learn · Practice · Classes        [avatar ▾: Profile · Notifications · Settings · Sign out]
```

### Hub mapping

| New hub | Absorbs | Sub-navigation inside the hub |
|---------|---------|-------------------------------|
| **Home** | Home (dashboard) | — (personalized landing) |
| **Learn** | Modules + Lessons + Course Library | *Cert Paths* (default) · *Browse Modules* · *All Lessons* |
| **Practice** | Practice Tests + Sandbox + Tools | *Practice Exams* · *Sandbox (Canvas)* · *Labs & Tools (soon)* |
| **Classes** | Classes + Assignments + Grades | *My Classes* · *Assignments* · *Grades* |
| **Profile menu** | Announcements + Teams + Sign out | Notifications · Teams (when built) · Settings · Sign out |
| *(removed from top nav)* | **Components** | Becomes a **palette/reference inside the Canvas**, where it belongs |

**Why this grouping:** *Learn* = acquire knowledge, *Practice* = apply it (test + build), *Classes* = instructor-led coursework, *Home* = where you are and what's next. Each maps to a distinct user intent, and nothing overlaps.

### The "Learn" hub is the headline change

Make **Cert Paths the default view** of Learn — the cert-centric model already built in `StudentLibraryBrowser` (provider → cert → domain-weighted study plan with exam-readiness). Surface each active cert as a card with progress and a readiness bar. "Browse Modules" and "All Lessons" remain as secondary views for people who prefer to wander the catalog. This single change turns three confusing tabs into one coherent, modern learning hub that reflects what Archon offers.

---

## 4. UI / interaction improvements

- **Grouped top nav (4–5 items)** with **in-hub sub-navigation** (a segmented control or secondary tab row). Eliminates the horizontal scroll and the 13-item overload.
- **Cert-centric Home.** Replace the generic dashboard with: *Continue studying* (your active cert + "41/58 lessons, 70% exam-ready"), *Up next* (due assignments, recommended next lesson), *Recent practice scores*, and a streak/activity nudge.
- **Promote cert paths visually** as the hero of Learn — cards per cert (icon, level badge, domain-weight ring, progress, "Resume").
- **Functional account menu.** Convert the static avatar into a dropdown (Profile, Settings, Notifications, Teams, Sign out). Either wire the bell to a real notifications panel or remove it until Announcements ships.
- **Fix the cert metadata.** Replace the hard-coded slug labels with the official exam codes; drop retired certs (Database/ML Specialty); pull labels from the cert manifests so the UI stays in sync with the content.
- **Consistent, honest empty states.** Don't give "Coming Soon" features a permanent top-level tab; surface them contextually inside the relevant hub (e.g., "Labs & Tools — coming soon" within Practice) so the nav only contains things that work.
- **Keep the visual language.** The Tailwind aesthetic is clean and modern; this is an IA and surfacing problem, not a re-skin. Preserve the look, fix the structure.

---

## 5. Phased implementation plan

**Phase 0 — Quick wins (low risk, ~0.5–1 day)**
- Delete orphaned `StudentDashboard.jsx`.
- Fix the Sandbox button (add a `/sandbox/canvas` route, or point it at the existing canvas; or hide Sandbox until wired).
- Remove the two empty tabs (Teams, Announcements) from the nav (keep routes or move to the profile menu).
- Update cert labels to official codes and remove retired certs in `StudentModules`.

**Phase 1 — Navigation consolidation (~3–5 days)**
- Refactor `AppShell` to the 4-hub model with in-hub sub-navigation.
- Build `Learn` (Cert Paths default, Modules + Lessons as sub-views), `Practice` (Exams + Sandbox), and fold Grades/Assignments into `Classes`.
- Move the Components catalog into the canvas as a palette/reference.
- Add redirects from old routes (`/modules`, `/lessons`, `/course-library`, `/tools`, `/sandbox`, `/grades`, `/announcements`, `/teams`) to their new homes so nothing 404s.

**Phase 2 — Cert-centric Home & surfacing (~2–3 days)**
- Rebuild Home around continue-studying, exam-readiness, up-next, and recent practice scores, driven by the cert manifests and progress data.

**Phase 3 — Polish & functional chrome (~1–2 days)**
- Account dropdown menu, notifications (or remove the bell), responsive nav, consistent empty states, and a pass on cert cards/visual hierarchy.

**Sequencing note:** Phase 0 is independent and shippable immediately. Phases 1–2 are the substantive UX win and should land together. Phase 3 is polish.

---

## 6. Summary recommendation

The platform outgrew its navigation. The fix is not a redesign of the look — it's a **consolidation around intent**: four hubs (Home, Learn, Practice, Classes) instead of thirteen flat tabs, with the **cert paths promoted to the center of Learn** to reflect what Archon now is. That removes every redundant and empty tab, surfaces the strongest new content (the cert study plans and practice banks), and gives learners a clear answer to "what am I working toward and how ready am I." Start with the Phase 0 quick wins (dead code, broken Sandbox link, stale cert labels, empty tabs), then land the hub consolidation.
