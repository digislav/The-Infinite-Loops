# ATS for Candidates - Product Requirements Document (Spring 2026)

_CS 490 Capstone Project_

## 1. Product Purpose and Vision

### 1.1 Product Purpose

ATS for Candidates is a candidate-facing application tracking system that flips the traditional employer-centric ATS model. The purpose is to give job seekers the same level of organization and workflow discipline that employers use during hiring.

The app addresses a common gap in job searching: applications are often managed across disconnected notes, files, and job boards. This creates inconsistent documents, missed follow-ups, and poor visibility into progress.

This product is a SaaS web application that supports multiple concurrent users. Accounts are created through self-registration, and each user works only within their own private dataset.

### 1.2 Business Concept

As a capstone project presented in a startup format, this platform is positioned as candidate-centric career software. The product goal is to turn an unstructured job search into a strategic, data-informed process.

### 1.3 Product Vision

A single, coherent web app where the user can:

1. Maintain a professional profile.
2. Track jobs from interest through outcome.
3. Create job-specific application materials.
4. Manage application status and interview activity in one place.
5. Measure progress with practical analytics.

### 1.4 Core Functional Areas

1. **User Profile**
2. **Dashboard/Job Board** (home page and primary workflow)
3. **Document Library**

The dashboard and job board are the same screen. It is the home page and where the user spends most of their time. The profile keeps personal and professional data current. The document library provides a global view of resumes and cover letters, even though day-to-day document actions should mostly happen from the dashboard/job board.

## 2. Target User

**Primary user:** job seekers in any field, at any career stage, from first job through experienced professional transitions.

**Academic context:** graduating CS students are still a key classroom audience, but the product requirements must remain broadly applicable to any profession and job market.

## 3. Core Product Structure

## 3.1 Navigation

Global navigation should be stable across all sprints:

1. `Dashboard` (home page, includes the full job board experience)
2. `Document Library`
3. `Profile`
4. `Settings`

## 3.2 Center of Gravity

The **Dashboard/Job Board** is the center of gravity.

Most user actions should start or end there:

1. Add/edit job entries.
2. Move jobs through pipeline stages.
3. Link/generate resume and cover letter versions for a specific job.
4. Capture interview notes/outcomes.
5. View actionable analytics tied to job activity.

## 3.3 Relationship Between Areas

1. **Profile** provides source data used by AI generation.
2. **Document Library** provides global management of all documents.
3. **Dashboard/Job Board** provides contextual document actions tied to specific applications.

## 4. Functional Requirements

## 4.1 Dashboard (Job Board - Central Hub)

### 1. Purpose

1.1 The Dashboard/Job Board is the primary operating surface for daily job search work.
1.2 It provides active job tracking, job-specific workflows, and progress visibility in one place.

### 2. Job Board Data Structure

2.1 Job Card Data (list-level)

- Job title
- Company name
- Location
- Current pipeline stage
- Last activity date
- Deadline (optional)
- Priority flag (optional)

  2.2 Job Detail Data (expanded view)

- Full job description (manual entry)
- Compensation notes (optional)
- Application date
- Recruiter/contact notes (optional)
- Custom notes

  2.3 Pipeline and Status Data

- Stage values: `Interested`, `Applied`, `Interview`, `Offer`, `Rejected`, `Archived`
- Stage change timestamp
- Outcome timestamp (where applicable)

  2.4 Interview and Activity Data

- Interview entries (date/time, round type, notes)
- Follow-up tasks/reminders
- Timeline events (applied, interview scheduled, interview completed, outcome)

  2.5 Job-Context Document Data

- Linked resume version(s)
- Linked cover letter version(s)
- Created-in-context document references

### 3. Required Dashboard Behaviors

3.1 Users can create, edit, archive, and update jobs.
3.2 Users can move jobs between pipeline stages and preserve stage history.
3.3 Each job card can expand into a job detail UI for documents, interviews, and status management.
3.4 Dashboard supports search, filtering, and sorting for active job management.
3.5 Dashboard metrics update from user-entered job and outcome data.

### 4. Data and Ownership Rules

4.1 Job board data is account-scoped and isolated per authenticated user.
4.2 Status and activity updates are persisted and reloaded accurately across sessions.
4.3 Job detail document actions use profile data and job context as inputs.

### 5. Acceptance Criteria

5.1 A user can view active jobs as cards on the home dashboard.
5.2 A user can expand a card into a job detail UI and edit all job-specific fields.
5.3 A user can move jobs through pipeline stages and see timestamped stage history.
5.4 A user can manage interview/status activity for a job from the expanded detail UI.
5.5 Dashboard metrics reflect stored job and outcome records.

## 4.2 User Profile

### 1. Purpose

1.1 The User Profile stores the candidate's core professional data.
1.2 The profile is the canonical data model for the user's background and preferences.
1.3 Profile data is maintained through structured forms.

### 2. Profile Structure

2.1 Identity and Contact

- First name
- Last name
- Email
- Phone
- Location
- Professional links (optional)

  2.2 Professional Summary

- Short headline
- Summary paragraph

  2.3 Experience

- Employment entries
- Project entries
- Start/end dates
- Role/title and organization
- Description and accomplishment bullets

  2.4 Education

- Institution
- Degree and field of study
- Dates
- Honors/GPA (optional)

  2.5 Skills

- Skill name
- Category (optional)
- Proficiency label (optional)

  2.6 Career Preferences

- Target roles
- Target locations
- Work mode preference
- Salary preference (optional)

### 3. Required Profile Behaviors

3.1 Users can create, edit, and delete records in each section.
3.2 Users can reorder Experience entries and Skills.
3.3 Each section supports independent save/update operations.
3.4 Profile completion status is visible and updates as data changes.
3.5 Form validation enforces required fields and displays clear error messages.

### 4. Data and Ownership Rules

4.1 Profile data is account-scoped and isolated per authenticated user.
4.2 Profile updates are persisted and reloaded accurately across sessions.
4.3 Profile data is the source data used by resume generation workflows on the Dashboard/Job Board.

### 5. Acceptance Criteria

5.1 A user can complete all profile sections through forms.
5.2 Saved profile data is retained after logout/login.
5.3 Validation prevents incomplete required submissions.
5.4 Completion indicator changes when required fields are added or removed.
5.5 Another user cannot read or modify this user's profile data.

## 4.3 Document Library

The document library must support:

1. Resume and cover letter records.
2. Upload existing documents.
3. Create new documents in-app.
4. Versioning (e.g., `Resume v1`, `Resume v2 - Backend Focus`).
5. Tagging/categorization (`General`, `Frontend`, `Backend`, `Data`, etc.).
6. Status flags (`Draft`, `Ready`, `Archived`).
7. Duplicate and rename actions.
8. Soft delete and restore.

### Acceptance Criteria

1. User can view all documents in a global list with filters.
2. User can open a document and view version history metadata.
3. User can link a specific document version to a job application.
4. User can generate a new version from an existing version.
5. Library changes are reflected in job-level document selectors.

## 4.4 AI Features (Allowed External Dependency)

AI usage is allowed for:

1. Resume bullet rewriting.
2. Resume tailoring to a job description.
3. Cover letter draft generation.
4. Suggesting improvements to user-written content.

AI is **not** a substitute for:

1. External factual data retrieval.
2. Hidden automation for unavailable APIs.
3. Fake integrations.

### Acceptance Criteria

1. AI output is generated from explicit user-provided inputs.
2. User can edit AI output before saving.
3. Saved AI content is versioned like any other document.
4. Prompt and output events are logged minimally for debugging (without storing secrets).

## 5. Non-Functional Requirements

1. **Security**: Password hashing, authenticated routes, self-registration with account ownership, and strict per-user data isolation (users cannot view or modify other users' data).
2. **Reliability**: No crash during normal CRUD and generation flows.
3. **Performance**: Standard pages load quickly under class-demo conditions.
4. **Usability**: Consistent layout/navigation; clear error messages.
5. **Accessibility**: Reasonable contrast, keyboard navigation for major actions, labeled form fields.
6. **Testing**: Unit test suite is required for all production code paths. Tests must cover expected behavior, validation failures, edge cases, and error paths; happy-path-only tests are insufficient even if code coverage is high.
7. **CI/CD**: Automated pipeline required for build, test, and deployment checks on each merge/pull request.
8. **Cloud Deployment**: App must be deployed to a cloud environment and accessible by URL for demos.

## 6. Data and Domain Model (High-Level)

### Minimum domain entities:

1. `User`
2. `Profile`
3. `Job`
4. `Document`
5. `DocumentVersion`
6. `JobDocumentLink`
7. `JobActivity`

### Required Relationships

1. `User 1:N Job`
2. `User 1:N Document`
3. `Document 1:N DocumentVersion`
4. `Job N:N DocumentVersion` via `JobDocumentLink`
5. `Job 1:N JobActivity`
6. `User 1:1 Profile`

## 7. Three-Sprint Product Plan

This is a progressive build of one app, not three separate apps.

Implementation order follows product priority and user workflow: dashboard/job board first, user profile second, document library third.

## Sprint 1 - Dashboard Foundation, Auth, and Profile Baseline

### Goal

Establish the dashboard/home foundation first, with authentication, CI/CD, and baseline profile support needed for downstream workflows.

### Required Product Outcomes

1. Dashboard shell and navigation baseline (home page structure).
2. Initial job card model and basic create/edit for active jobs.
3. Auth (register/login/logout/reset path).
4. CI pipeline configured and enforced for pull requests (build and test checks).
5. Profile baseline CRUD (identity/contact + summary + basic completion indicator).

### Sprint 1 Scope Notes

1. Keep UI simple and coherent.
2. No document library UI yet.
3. No interview workflow yet.

## Sprint 2 - Dashboard Completion and Profile Completion

### Goal

Complete the dashboard/job board as the full operating surface, then complete remaining profile sections that power job-context workflows.

### Required Product Outcomes

1. Dashboard/job board search/filter/sort.
2. Active job cards with stage/status indicators.
3. Expandable job detail UI from each card.
4. Job detail workflow for document creation from profile + job context.
5. Job detail workflow for interview tracking and status updates.
6. Activity timeline for each job (manual events).
7. Basic dashboard metrics (counts by stage and response tracking from user-entered outcomes).
8. Complete remaining User Profile sections and validations (experience, education, skills, preferences).

### Sprint 2 Scope Notes

1. AI output quality matters less than workflow correctness and editability.
2. All primary document actions happen inside job detail.
3. Document library implementation is deferred to Sprint 3.

## Sprint 3 - Document Library, Company Research, and Deployment

### Goal

Complete global document management, add company research to job details, and deliver cloud deployment.

### Required Product Outcomes

1. Document Library implementation (global view, filters, version visibility, archive/restore).
2. Dashboard-to-library integration for linked/created documents.
3. Company research in job detail using AI-assisted synthesis from user-provided inputs.
4. Follow-up/reminder support (internal app logic only).
5. Expanded analytics (pipeline velocity, stage conversion, per-month activity).
6. Cloud deployment and production hardening (error handling, test coverage targets, deployment reliability).

### Sprint 3 Scope Notes

1. Keep analytics practical and based on real stored fields.
2. No third-party integrations beyond AI.
3. Focus on coherence, stability, and demo quality.

## 8. Coherence Rules Across Sprints

1. Do not create disconnected pages for each new feature.
2. New features must attach to existing navigation and existing data model.
3. If a feature belongs to a job, it belongs inside `Job Detail`.
4. If a feature belongs to documents globally, it belongs in `Document Library`.
5. If a feature belongs to user identity/background, it belongs in `Profile`.

## 9. Definition of Done (Project-Level)

A team is done when:

1. The deployed app supports full user flow:
   - Create account
   - Complete profile
   - Add jobs
   - Create/link documents
   - Generate AI-assisted application content
   - Track outcomes
2. Data is isolated by user account, and users cannot view or modify data owned by other users.
3. The app demonstrates coherent UX and consistent navigation.
4. No required feature depends on disallowed third-party APIs.
5. Core paths are tested and stable for demo.
6. Unit tests are meaningful and include negative/error-path assertions, not only happy-path assertions.

## 10. Final Notes to Teams

Build one strong product, not a collection of demos.

If you are unsure where a feature belongs:

1. Ask whether it is **user-centric**, **document-centric**, or **job-centric**.
2. Place it in Profile, Document Library, or Dashboard/Job Board accordingly.
3. Default to Dashboard/Job Board for application workflow features.

This project is still ambitious, but the scope is intentionally tighter this semester so teams can deliver cleaner architecture, better UX, and stronger demos.
