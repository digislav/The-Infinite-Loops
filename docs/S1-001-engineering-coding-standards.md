# S1-001 — Engineering Coding Standards
**ATS for Candidates | NJIT CS490 Capstone | Sprint 1 | Spring 2026**

| Field | Detail |
|-------|--------|
| Story ID | S1-001 |
| Sprint | Sprint 1 — Dashboard Foundation, Auth, CI/CD & Profile Baseline |
| Category | A. AI Context Documents (required before feature coding) |
| Status | Published |
| Tech Spec Sections | TECH-SPEC.md §§4, 5, 7, 8 |
| Audience | All engineers + AI coding assistants |

---

## 1. Purpose and Scope

This document establishes the engineering coding standards for the ATS for Candidates project. It is both a human reference and an AI context document — meaning it is intended to be included in AI coding prompts so that every code suggestion aligns with team conventions from day one.

All team members must follow these standards on every pull request. AI-generated code is subject to the same standards and must be reviewed against this document before merge. Standards not explicitly addressed here default to the Airbnb JavaScript Style Guide and Next.js best practices.

> **AI Tip:** When generating code for this project, always apply the conventions in this document. If a request conflicts with these standards, note the conflict and apply the standard unless explicitly overridden by the reviewer.

---

## 2. Technology Stack Reference

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui component library |
| Backend | Next.js Route Handlers (App Router API routes) |
| Database | Supabase (PostgreSQL) via Supabase JS client |
| Authentication | Supabase Auth (JWT-based sessions) |
| AI Provider | Selectable: OpenAI / Anthropic Claude / Google Gemini |
| Deployment | Vercel (frontend + serverless functions) |
| DevOps | Docker (local dev) + GitHub Actions (CI/CD) |
| Testing | Jest (unit) + Cypress (e2e) |

---

## 3. Naming Conventions

### 3.1 General Principles

- Names must be descriptive and self-documenting. Abbreviations are only acceptable for universally understood terms (e.g., `id`, `url`, `db`).
- Never use single-letter variables outside of short loop indices (`i`, `j`) or well-known mathematical contexts.
- Be consistent: once a term is established in the codebase (e.g., `jobActivity`, `documentVersion`), use it verbatim everywhere.

### 3.2 TypeScript / JavaScript

| Construct | Convention + Example |
|-----------|---------------------|
| Variables & functions | `camelCase` — `getUserProfile`, `jobId`, `isLoading` |
| React components | `PascalCase` — `JobCard`, `DashboardHeader`, `ProfileForm` |
| Constants (module-level) | `UPPER_SNAKE_CASE` — `MAX_RESUME_VERSIONS`, `DEFAULT_STAGE` |
| TypeScript interfaces | `PascalCase` — `Job`, `UserProfile`, `DocumentVersion` |
| TypeScript type aliases | `PascalCase` — `PipelineStage`, `ApiResponse<T>` |
| TypeScript enums | `PascalCase` enum, `UPPER` values — `PipelineStage.APPLIED` |
| Custom hooks | `camelCase`, `use` prefix — `useJobs`, `useAuth`, `useProfile` |
| Context objects | `PascalCase` + `Context` suffix — `AuthContext`, `JobContext` |
| Boolean variables | `is/has/can` prefix — `isLoading`, `hasError`, `canEdit` |
| Event handlers (props) | `handle` prefix — `handleSubmit`, `handleStageChange` |
| Event handler functions | `on` prefix — `onClick`, `onSuccess`, `onError` |

### 3.3 Database (PostgreSQL / Supabase)

| Construct | Convention + Example |
|-----------|---------------------|
| Table names | `snake_case`, plural — `users`, `job_activities`, `document_versions` |
| Column names | `snake_case` — `user_id`, `created_at`, `pipeline_stage` |
| Primary keys | `id` (UUID, default `gen_random_uuid()`) |
| Foreign keys | `{referenced_table_singular}_id` — `user_id`, `job_id`, `document_id` |
| Timestamps | `created_at`, `updated_at` (`timestamptz`, `NOT NULL`) |
| Boolean columns | `is_` prefix — `is_archived`, `is_draft` |
| Enum-like columns | `TEXT` with `CHECK` constraint or Postgres enum |
| Migration files | `YYYYMMDDHHMMSS_short_description.sql` |
| Indexes | `idx_{table}_{column}` — `idx_jobs_user_id` |

### 3.4 API Routes

| Convention | Detail |
|-----------|--------|
| Resource paths | Lowercase kebab-case nouns, plural — `/api/jobs`, `/api/documents` |
| Nested resources | `/api/{resource}/{id}/{child}` — `/api/jobs/:id/activities` |
| Route file naming | Next.js App Router: `app/api/{resource}/route.ts` |
| Route handler naming | Named exports matching HTTP verbs: `GET`, `POST`, `PUT`, `DELETE`, `PATCH` |
| No verbs in paths | Use HTTP methods instead — `POST /api/documents` NOT `/api/create-document` |

### 3.5 File and Asset Naming

| Artifact | Convention + Example |
|----------|---------------------|
| React component files | `PascalCase.tsx` — `JobCard.tsx`, `DashboardHeader.tsx` |
| Page files (App Router) | lowercase: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` |
| Utility / helper files | `camelCase.ts` — `formatDate.ts`, `apiHelpers.ts` |
| Hook files | `camelCase.ts` starting with `use` — `useJobs.ts`, `useAuth.ts` |
| Type definition files | `camelCase.types.ts` — `job.types.ts` |
| Test files | Same name + `.test.ts(x)` — `JobCard.test.tsx`, `jobService.test.ts` |
| Supabase migration files | `YYYYMMDDHHMMSS_description.sql` |
| Environment files | `.env.local` (never committed), `.env.example` (committed) |

---

## 4. Folder Structure

### 4.1 Project Root

```
/ (project root)
├── app/                   # Next.js App Router
├── components/            # Shared React components
├── lib/                   # Shared utilities, clients, helpers
├── hooks/                 # Custom React hooks
├── types/                 # Global TypeScript types/interfaces
├── supabase/              # DB migrations + generated types
├── __tests__/             # Root-level integration tests (Jest)
├── cypress/               # E2E tests
├── public/                # Static assets
├── .github/workflows/     # GitHub Actions CI/CD
├── .env.example           # Non-secret env var template
└── docs/                  # Architecture and context documents
```

### 4.2 App Router Structure

```
app/
├── (auth)/                # Auth route group
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── reset-password/page.tsx
├── (app)/                 # Authenticated app route group
│   ├── dashboard/page.tsx
│   ├── profile/page.tsx
│   ├── documents/page.tsx
│   └── settings/page.tsx
└── api/                   # Route Handlers
    ├── auth/
    ├── jobs/
    ├── profile/
    ├── documents/
    └── ai/
```

### 4.3 Components Structure

```
components/
├── ui/                    # shadcn/ui primitives (do not modify)
├── layout/                # TopNav, SideNav, AppShell
├── dashboard/             # DashboardHeader, JobCard, JobBoard
├── profile/               # ProfileForm, ExperienceList, SkillSection
├── documents/             # DocumentCard, VersionHistory
├── auth/                  # LoginForm, RegisterForm
└── shared/                # Reusable primitives not in shadcn
```

### 4.4 Lib Structure

```
lib/
├── supabase/              # Supabase client (browser + server)
├── services/              # Domain service functions
│   ├── jobService.ts
│   ├── profileService.ts
│   ├── documentService.ts
│   └── aiService.ts
├── validators/            # Zod schemas for input validation
└── utils/                 # Pure utility functions (apiResponse.ts goes here)
```

### 4.5 Supabase Structure

```
supabase/
├── migrations/            # Versioned SQL migration files
├── seed.sql               # Local dev seed data (optional)
└── types.ts               # Auto-generated DB types (supabase gen)
```

> **Rule:** Never import components across domain boundaries. Use `shared/` for cross-domain primitives.

---

## 5. Linting and Formatting Rules

### 5.1 Toolchain

| Tool | Purpose + Config |
|------|-----------------|
| ESLint | Linting — extends `next/core-web-vitals` + `@typescript-eslint/recommended` |
| Prettier | Formatting — `.prettierrc` committed to repo |
| TypeScript | Type checking — `tsconfig.json` with `strict: true` |
| Husky + lint-staged | Pre-commit hook: runs ESLint + Prettier on staged files |
| GitHub Actions | CI enforces lint, type-check, and build on every PR |

### 5.2 Prettier Configuration (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

### 5.3 ESLint Key Rules

- `no-unused-vars: error` — remove unused imports and variables before committing.
- `@typescript-eslint/no-explicit-any: error` — never use `any`. Use `unknown` or a typed generic.
- `@typescript-eslint/explicit-function-return-type: warn` on exported functions — annotate return types.
- `react-hooks/rules-of-hooks: error` — hooks must follow the Rules of Hooks.
- `react-hooks/exhaustive-deps: warn` — address all missing dependency warnings.
- `no-console: warn` in production paths — use structured logger utility instead.

### 5.4 TypeScript Settings

- `strict: true` must remain enabled in `tsconfig.json`. Do not disable it.
- All function parameters and return types must be typed explicitly on exported and service-layer functions.
- Use Zod for runtime validation of external inputs. Infer TypeScript types from Zod schemas where applicable.
- Prefer `type` over `interface` for simple type aliases; prefer `interface` for object shapes that may be extended.

### 5.5 General Code Style Rules

- Maximum file length: **300 lines**. If a file exceeds this, split it.
- Maximum function length: **50 lines**. Extract sub-logic into named helper functions.
- Imports: group in this order: (1) Node/React/Next built-ins, (2) third-party libraries, (3) internal absolute imports, (4) relative imports. Separate groups with a blank line.
- No magic numbers or magic strings — extract to named constants.
- Prefer `const` over `let`. Never use `var`.
- Avoid deep nesting (>3 levels). Use early returns (guard clauses) to flatten logic.
- No commented-out code in committed PRs.

---

## 6. Error Handling Style

### 6.1 Backend — API Route Handlers

```typescript
// Standard API route handler pattern
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = mySchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 400, parsed.error.flatten());
    }
    const result = await myService.doThing(parsed.data);
    return apiSuccess(result, 201);
  } catch (error) {
    logger.error('POST /api/thing failed', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
```

### 6.2 Error Rules — Backend

- Never expose stack traces, internal service names, or database error messages to the client.
- All 500-class errors must be logged server-side with context.
- Validation errors (400) must identify the offending field(s).
- Authentication errors must return **401**. Authorization errors must return **403**.
- Not found must return **404** with a safe message.
- Use centralized `apiError()` and `apiSuccess()` helpers for all responses.

### 6.3 Frontend — Client-Side Errors

- All data-fetching calls must handle loading, success, and error states explicitly.
- User-visible error messages must be human-friendly. Never display raw error objects.
- Form validation errors must be displayed inline, adjacent to the offending field.
- Preserve unsaved work on network failure.
- Log client errors with sufficient context, but never log auth tokens or PII.

---

## 7. API Response Conventions

### 7.1 Response Envelope

**Success Response:**
```json
{
  "success": true,
  "data": { },
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": {
      "email": ["Email is required"]
    }
  }
}
```

### 7.2 HTTP Status Code Conventions

| Code | When to Use |
|------|------------|
| 200 OK | Successful GET, PUT, PATCH |
| 201 Created | Successful POST that creates a resource |
| 204 No Content | Successful DELETE (no body) |
| 400 Bad Request | Input validation failure |
| 401 Unauthorized | No valid session / not authenticated |
| 403 Forbidden | Authenticated but not authorized |
| 404 Not Found | Resource does not exist |
| 409 Conflict | Duplicate resource (e.g., email already registered) |
| 500 Internal Server Error | Unexpected server failure |

### 7.3 Error Code Registry

| Error Code | Meaning |
|-----------|---------|
| `VALIDATION_ERROR` | Input failed schema validation |
| `AUTH_REQUIRED` | Request is not authenticated |
| `FORBIDDEN` | Authenticated user does not own this resource |
| `NOT_FOUND` | Requested resource does not exist |
| `DUPLICATE_EMAIL` | Registration with already-registered email |
| `INVALID_CREDENTIALS` | Login failed |
| `TOKEN_EXPIRED` | Reset or session token has expired |
| `INVALID_STAGE` | Job pipeline stage transition not permitted |
| `AI_UNAVAILABLE` | AI provider request failed or timed out |
| `INTERNAL_ERROR` | Unexpected server error (safe fallback) |

### 7.4 apiSuccess and apiError Helpers

```typescript
// lib/utils/apiResponse.ts
import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T, status = 200, meta?: object) {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) }, { status });
}

export function apiError(code: string, status: number, fields?: object) {
  return NextResponse.json(
    { success: false, error: { code, message: ERROR_MESSAGES[code] ?? code, ...(fields && { fields }) } },
    { status },
  );
}
```

---

## 8. Testing Conventions

### 8.1 File Location and Naming

- Unit tests live alongside the file they test: `JobCard.test.tsx` next to `JobCard.tsx`.
- Integration tests live in `__tests__/` at the project root.
- E2E tests live in `cypress/e2e/`.

### 8.2 Required Test Categories per Feature

| Category | What to Test |
|----------|-------------|
| Happy path | Expected inputs produce expected outputs |
| Validation failure | Invalid inputs are rejected with correct error codes |
| Error/exception | Service/DB failures are caught and handled gracefully |
| Authorization | Cross-user access is blocked; unauthenticated requests return 401 |

### 8.3 Test Style Rules

- Use `describe`/`it` blocks. `describe` names the unit under test; `it` describes the scenario.
- Test names must read as sentences: `it('returns 403 when user does not own the job')`.
- Each test must have a single assertion focus.
- Mock Supabase and AI provider calls — never make real network calls in unit tests.

---

## 9. Git and Branch Conventions

### 9.1 Branch Naming

| Type | Pattern + Example |
|------|------------------|
| Feature | `feature/S1-XXX-short-description` — `feature/S1-019-job-entity` |
| Bug fix | `fix/S1-XXX-short-description` — `fix/S1-020-card-rendering` |
| Chore / config | `chore/short-description` — `chore/setup-eslint` |
| Documentation | `docs/short-description` — `docs/update-s1-001` |

### 9.2 Commit Message Format

Follow Conventional Commits:
```
feat(jobs): add job entity storage with user ownership
fix(auth): handle expired session on protected routes
chore(ci): add lint step to GitHub Actions workflow
test(jobs): add ownership checks to job service tests
```

Valid types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`, `ci`, `build`.

### 9.3 Pull Request Requirements

- PR title must include the Jira story ID: `[S1-019] Implement Basic Job Entity and Storage`.
- PR description must reference Tech Spec sections impacted.
- All CI checks must pass before merge.
- Require at least one peer review approval.
- No direct pushes to `main`.
- Delete the feature branch after merge.

---

## 10. Environment and Secret Management

- All secrets live in `.env.local` (never committed).
- Commit a `.env.example` with all required variable names but no values.
- AI provider API keys must only be accessed server-side (no `NEXT_PUBLIC_` prefix).
- Never hardcode environment values in application code.

| Variable | Location + Notes |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server — `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server — `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose client-side |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Server only — `.env.local` |
| `NEXT_PUBLIC_APP_URL` | Client + server — base URL for auth redirects |

---

## 11. Document Maintenance

- **Owner:** Engineering team collectively
- **Review cadence:** Start of each sprint; ad hoc when a gap is identified
- **Location in repo:** `docs/S1-001-engineering-coding-standards.md`
- **Questions:** Raise as a PR comment or Jira comment on S1-001

> **AI Reminder:** This document is the authoritative coding standard for this project. When generating code, always apply these conventions. Do not invent new naming patterns, folder structures, or response shapes without confirming with the team.
