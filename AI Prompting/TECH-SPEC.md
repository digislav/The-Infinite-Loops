# ATS for Candidates - Technical Specifications (Spring 2026)

This document defines how teams will build the product described in `ATS-PRD.md` and experienced through `UX.md`. The PRD tells us what to build. This document tells us how to build it consistently, safely, and at production quality.

This is a project-level technical specification. Teams will apply it incrementally by sprint through Jira stories.

## 1. Scope and Relationship to Other Documents

Use the documents in this order:

1. `ATS-PRD.md` for product scope and acceptance expectations.
2. `UX.md` for user experience direction.
3. `TECH-SPEC.md` for implementation standards and engineering guardrails.
4. Sprint backlog stories for execution slices.

If there is a conflict between implementation convenience and product requirements, follow the PRD and UX guidance.

## 2. Architecture and Service Model

Before implementation starts, each team must complete an architecture baseline exercise. This is the technical starting point for Sprint 1.

### 2.1 Sprint 1 Architecture Baseline (Required)

Each team must submit a short architecture baseline document before feature development begins.

Required contents:

1. Technology stack (frontend, backend, database, AI provider, deployment platform).
2. Core domain entities and conceptual relationships.
3. Database strategy (SQL/NoSQL choice, main tables/collections, migration approach).
4. API model (core resources and representative endpoints).
5. Frontend structure (major screens and key UI component hierarchy).
6. Simple architecture diagram (frontend, backend API, database, AI integration).

This baseline does not need to be perfect, but it must be coherent and implementation-ready. Teams may adjust details later, but architectural deviations should be intentional and documented.

### 2.2 Reference Architecture Expectations

The application is a multi-user SaaS web platform with self-registration.

Minimum architecture must include:

1. Frontend application for Dashboard, Profile, Document Library, and Settings.
2. Backend API layer for authentication, authorization, and domain workflows.
3. Persistent database for user-scoped domain records.
4. File/object storage or equivalent mechanism for document upload/download workflows.

The app should be designed around domain boundaries, not around pages. At minimum, keep boundaries for:

1. Authentication and sessions.
2. User profile domain.
3. Job board domain.
4. Document domain.
5. AI generation workflows.

## 3. Data Ownership and Authorization Rules

This project is not single-user. Every domain operation must enforce ownership.

Required ownership rules:

1. Every user-scoped entity stores owner identity.
2. All read/write operations verify ownership at the backend.
3. APIs must reject cross-user access attempts with correct status codes.
4. Frontend route guards are required, but backend ownership checks are authoritative.
5. Ownership must apply equally to documents, versions, jobs, notes, timeline events, and linked records.

No implementation is complete without authorization checks in API handlers or service-layer guards.

## 4. API and Error-Handling Standards

API behavior must be consistent across endpoints.

Required API standards:

1. Use consistent response envelopes for success and error cases.
2. Return clear status codes for validation, auth, not-found, and server errors.
3. Validation errors must identify offending fields.
4. Avoid leaking internal stack traces to clients.
5. Log structured server-side errors with request correlation metadata when possible.

Error handling must be deliberate in both frontend and backend:

1. Frontend should show user-friendly errors and preserve unsaved work when practical.
2. Backend should centralize common error mapping and response formatting.

## 5. UI Implementation Standards

Teams may choose navigation and dashboard paradigm, but interaction consistency is required.

Required UI standards:

1. Choose one navigation pattern and keep it throughout the app.
2. Choose one dashboard interaction paradigm and keep it throughout the app.
3. Keep reusable components visually and behaviorally consistent.
4. Keep status indicators, form validation, and action placement predictable.
5. Optimize desktop first while ensuring responsive usability on mobile and tablet.

The Dashboard/Job Board remains the primary operating surface and must receive the highest UX quality focus.

## 6. AI Integration Standards

AI is allowed only where defined in PRD scope.

Required AI implementation standards:

1. AI requests must be triggered from explicit user actions.
2. Inputs to AI should be traceable to profile data and job context.
3. AI outputs are drafts; users must be able to edit before save.
4. AI-generated artifacts must be stored as document versions with ownership.
5. Never simulate unavailable third-party APIs through fabricated AI outputs.

Prompt handling standards:

1. Do not commit secrets or keys to source control.
2. Keep model/provider configuration in environment settings.
3. Log minimal, safe metadata for debugging AI failures.

## 7. Testing Standards

Unit testing is mandatory and must be meaningful.

### 7.1 Test Scope Requirements

All production code paths must have unit test coverage. Coverage percentage is necessary but not sufficient.

### 7.2 Required Test Categories

For each significant feature or service, tests must include:

1. Expected behavior (happy path).
2. Validation failure behavior.
3. Error/exception behavior.
4. Edge and boundary cases.
5. Authorization and ownership behavior for protected data.

### 7.3 Domain-Specific Testing Requirements

At minimum, include targeted unit tests for:

1. Auth/session rules.
2. Ownership checks (cannot access other users' data).
3. Job stage transition logic and timeline updates.
4. Profile completeness calculations.
5. Document versioning, archive/restore, upload/download, and job-linking rules.

### 7.4 Story-Level Definition of Done for Testing

A story is not done unless:

1. Relevant unit tests were added or updated.
2. Tests include negative and edge cases, not just happy path.
3. CI test checks pass.

### 7.5 What Does Not Count as Acceptable Coverage

The following are insufficient by themselves:

1. Happy-path-only tests.
2. Superficial tests that only assert status code 200.
3. High coverage achieved by testing wrappers while skipping core logic.

## 8. CI/CD and Branch Policy Standards

Every team must maintain an automated quality gate.

Required CI/CD standards:

1. Pull requests run lint, build, and unit tests.
2. Failing checks block merge.
3. Main branch remains deployable.
4. Deployment pipeline is automated by Sprint 3 requirements.

Recommended branch policy:

1. Feature branches per story.
2. Pull request review before merge.
3. No direct pushes to protected main branch.

## 9. Deployment and Runtime Standards

Deployment is required for final delivery and should be approached incrementally.

Required runtime standards:

1. Publicly accessible deployed app URL.
2. Environment-specific config management.
3. Production database migration strategy.
4. Basic observability for runtime failures.

Production hardening expectations include:

1. Consistent error handling.
2. Safe fallback behavior for AI failures.
3. Smoke-test verification before demos/releases.

## 10. Data Model Guardrails

Use PRD entities as minimum baseline:

1. User
2. Profile
3. Job
4. JobActivity
5. Document
6. DocumentVersion
7. JobDocumentLink

Guardrails:

1. Maintain referential integrity between linked entities.
2. Avoid denormalized duplicates that drift from canonical profile data.
3. Keep audit-friendly timestamps on user-facing records where relevant.

## 11. Jira Traceability Rules

Jira stories are execution units. This document is the standards contract.

Required traceability practice:

1. Each story references relevant Tech Spec sections in its description.
2. Story Definition of Done includes test and ownership checks.
3. Pull requests reference both story ID and impacted Tech Spec sections.

Suggested Jira custom fields:

1. `Tech Spec Sections`
2. `Test Evidence`
3. `Security/Ownership Impact`

## 12. Sprint Application Guidance

This is a project-level spec, but use it sprint by sprint:

1. Sprint 1: enforce standards for auth, ownership, CI, and dashboard/profile baseline.
2. Sprint 2: enforce standards for dashboard workflow depth, AI job-context features, and profile completion.
3. Sprint 3: enforce standards for document library robustness, deployment quality, and hardening.

## 13. Final Engineering Standard

The team is building one product, not a sequence of disconnected demos. Engineering decisions must preserve:

1. Product coherence.
2. User data protection.
3. Testable behavior.
4. Deployable quality.

If a shortcut conflicts with these four principles, it is the wrong shortcut.
