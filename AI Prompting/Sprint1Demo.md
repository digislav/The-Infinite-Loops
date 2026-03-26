# Sprint 1 Demo Script (Spring 2026)

_ATS for Candidates - CS 490 Capstone_

## Demo Intent

Sprint 1 demo has two goals:

1. Verify that each team delivered the Sprint 1 baseline product outcomes.
2. Verify that the team understands its architecture and implementation choices.

This is not a feature tour. It is a focused verification demo.

## Class Timing Model

There are 6 teams and a 2-hour demo window. To finish on time, each team has a strict 15-minute presentation slot, with a 5-minute setup/transition allocation outside the team presentation time.

### Per-Team Timebox (15 minutes presentation time)

1. **Phase A - Scripted Product Demo**: 8 minutes
2. **Phase B - Technical Evidence and Q&A**: 7 minutes

### Setup/Transition Allocation (5 minutes each)

This 5-minute allocation is used:

1. Before the first team begins.
2. Between team presentations for projector/device transition.

Suggested sequence per team block:

1. **Transition/Setup**: 5 minutes
2. **Phase A - Scripted Product Demo**: 8 minutes
3. **Phase B - Technical Evidence and Q&A**: 7 minutes

## Time Enforcement Rules

1. Team presentation clock starts when the 15-minute presentation slot begins.
2. Setup/transition is limited to the 5-minute allocation outside presentation time.
3. Missing evidence is scored as missing; extra time is not granted.
4. One presenter should drive. One backup teammate may assist if needed.

---

## Required Preparation (Before Demo Day)

Each team must be ready with:

1. A working deployed or runnable environment for live demo.
2. Two test accounts:
   - User A (owner of visible sample data)
   - User B (different user for ownership/isolation checks)
3. Seed data for dashboard and profile baseline.
4. CI evidence ready to show quickly (build + test checks).
5. Unit test evidence ready to show quickly, including at least one non-happy-path test.
6. Architecture baseline document from Sprint 1 lab.

Recommended:

1. Keep a one-page "demo run sheet" with exact click path.
2. Keep credentials and key URLs ready in a text file.

---

## Phase A - Scripted Product Demo (8 minutes)

Show only the required Sprint 1 outcomes.

### A1. Authentication Baseline (2 minutes)

Required actions:

1. Register a new user account (or show pre-created account and explain registration flow).
2. Login with valid credentials.
3. Logout and verify protected route behavior.
4. Attempt access to protected page while logged out; show redirect/denied behavior.

### A2. Dashboard Baseline (3 minutes)

Required actions:

1. Open Dashboard (home page).
2. Show job cards with baseline fields.
3. Create a new job.
4. Edit an existing job.
5. Show job persistence after refresh.

### A3. Profile Baseline (2 minutes)

Required actions:

1. Open Profile baseline fields (identity/contact + summary).
2. Update at least one field and save.
3. Show completion indicator behavior.
4. Show persisted profile update after reload/navigation.

### A4. Settings Baseline (1 minute)

Required actions:

1. Open Settings page.
2. Show baseline structure and consistency with app shell/navigation.

---

## Phase B - Technical Evidence and Instructor Q&A (7 minutes)

This section is instructor-led. Team answers concise, technical questions with evidence.

### B1. Ownership and Security Evidence (2 minutes)

Required evidence:

1. Show that User B cannot view or modify User A data.
2. Show one backend ownership enforcement point (route/service/guard).

Acceptable demonstration pattern:

1. Login as User A and show one owned record ID (job, profile segment, or document).
2. Login as User B and attempt to access that record.
3. Show deny behavior (`403` or resource-not-found ownership deny pattern).
4. Show the backend enforcement point in code (middleware, guard, policy, or service check).
5. Show one unit test that asserts ownership denial.

### B2. CI and Unit Testing Evidence (3 minutes)

Required evidence:

1. Show CI checks running and passing for build + tests.
2. Show at least one unit test for normal behavior.
3. Show at least one unit test for non-happy-path behavior (validation/error/unauthorized).
4. Explain why the non-happy-path test matters.

Note: Phase A remains a happy-path walkthrough. Negative/error handling is demonstrated here in evidence form.

### B3. Architecture and Implementation Q&A (3 minutes)

Instructor may ask any of the following:

1. Why this frontend/backend/database stack?
2. How are core entities related (User/Profile/Job/etc.)?
3. How does API structure map to domain resources?
4. How does your dashboard interaction model stay consistent?
5. What tradeoff did your team make and why?

"Domain resources" means the primary API nouns representing system data. For this project, examples include:

1. `users`
2. `profile`
3. `jobs`
4. `job-activities`
5. `documents`
6. `document-versions`
7. `job-document-links`

Team should answer briefly and show artifacts only when needed.

---

## Sprint 1 Scoring Rubric (Suggested)

Total: 50 points

Project weighting model:

1. Sprint 1: 50 points
2. Sprint 2: 50 points
3. Sprint 3: 100 points

### 1) Preparation and Time Discipline (8 points)

1. Setup readiness and start on time (2)
2. Demo flow preparedness and pacing (3)
3. Completion within slot (3)

### 2) Product Baseline Delivery (22 points)

1. Authentication baseline complete (7)
2. Dashboard baseline complete (8)
3. Profile + Settings baseline complete (7)

### 3) Technical Evidence Quality (15 points)

1. Ownership/isolation proof with two users (6)
2. CI pipeline evidence (4)
3. Meaningful unit test evidence (5)

### 4) Architecture Understanding (5 points)

1. Clear explanation of architecture and key decisions (5)

---

## Failure Modes and Penalties

1. No ownership/isolation proof: major deduction in Technical Evidence.
2. CI not available or failing: deduction in Technical Evidence.
3. Only happy-path test shown: partial credit only for testing criterion.
4. Demo exceeds slot: remaining items scored as not demonstrated.
