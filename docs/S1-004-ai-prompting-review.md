# S1-004 — AI Prompting & Review Standards

**ATS for Candidates | NJIT CS490 Capstone | Sprint 1 | Spring 2026**

| Field              | Detail                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Story ID           | S1-004                                                                                         |
| Sprint             | Sprint 1 — Dashboard Foundation, Auth, CI/CD & Profile Baseline                                |
| Status             | Published                                                                                      |
| Tech Spec Sections | TECH-SPEC.md §§6, 7, 8, 11                                                                     |
| Companion Docs     | S1-001 Engineering Coding Standards, S1-002 UI/UX Standards, S1-003 Data & Security Guardrails |
| Audience           | All engineers + AI coding assistants                                                           |

---

## 1. Purpose and Scope

This document defines how AI-assisted code generation is used, prompted, reviewed, tested, and approved on the ATS for Candidates project.

AI coding assistants are permitted and encouraged. However, **AI tools do not replace engineering judgment**. Every line of AI-generated code is the responsibility of the engineer who prompted it, reviewed it, and merged it. **The merge is the approval.**

> **Note:** This document covers two distinct AI uses: (1) **AI coding assistants** used by engineers to generate application code (GitHub Copilot, Claude, ChatGPT, Cursor, etc.), and (2) **AI provider integrations** built into the product itself (resume generation, cover letter generation). Both are governed here. Sections 2–9 cover engineering workflow; Section 10 covers product AI features.

---

## 2. The Context Document System

### 2.1 Why Context Documents Exist

An AI coding assistant with no project context will invent conventions, ignore security requirements, and produce inconsistent code. The S1-001 through S1-004 context documents exist to prevent this. They are inputs to every AI prompt.

### 2.2 Context Document Inventory

| Document                               | File                                          | Primary Concerns                                                                      |
| -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| S1-001 Engineering Coding Standards    | `docs/S1-001-engineering-coding-standards.md` | Naming conventions, folder structure, linting, error handling, API response shapes    |
| S1-002 UI/UX Standards                 | `docs/S1-002-uiux-standards.md`               | Navigation model, dashboard interaction, component usage, spacing, typography, colour |
| S1-003 Data & Security Guardrails      | `docs/S1-003-data-security-guardrails.md`     | Per-user data ownership, authorization checks, RLS policies, protected routes         |
| S1-004 AI Prompting & Review Standards | `docs/S1-004-ai-prompting-review.md`          | This document.                                                                        |

> **Rule:** Before writing any AI prompt for a feature, identify which context documents are relevant and include them. A backend API route prompt must include S1-001 and S1-003 at minimum. A frontend component prompt must include S1-001 and S1-002 at minimum.

### 2.3 How Context Documents Are Used in Prompts

1. Open the relevant context documents from `docs/` in your editor.
2. Start a **new** AI conversation or chat session. Do not reuse stale conversation history.
3. Paste or attach the relevant context documents as the first message.
4. Then describe the specific task you want the AI to complete.

> **Tip:** For tools like Cursor or GitHub Copilot that support project-level context files (`.cursorrules`, `AGENTS.md`, `copilot-instructions.md`), copy key sections from S1-001 through S1-004 into those files so context is loaded automatically.

---

## 3. Prompting Standards

### 3.1 Anatomy of a Good Prompt

| Part           | What to Include                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Context     | Paste or reference the relevant context documents. State the tech stack: Next.js 14 App Router, TypeScript strict mode, Supabase, Tailwind CSS, shadcn/ui. |
| 2. Scope       | Name the Jira story ID (e.g., S1-019) and state the specific outcome.                                                                                      |
| 3. Constraints | List non-negotiable rules: ownership check required, use `apiSuccess`/`apiError` helpers, no `any` type, use shadcn/ui components.                         |
| 4. Task        | The specific ask: 'Write the GET /api/jobs route handler'.                                                                                                 |

### 3.2 Prompt Templates

#### Backend API Route Handler

```
You are generating a Next.js 14 App Router API route handler for the ATS for Candidates project.

[Paste S1-001 Engineering Coding Standards]
[Paste S1-003 Data & Security Guardrails]

Story: S1-019 — Implement Basic Job Entity and Storage

Task: Write the GET /api/jobs route handler that:
- Retrieves the authenticated user's session using supabase.auth.getUser()
- Returns 401 with error code AUTH_REQUIRED if no session
- Queries only jobs WHERE user_id = user.id (never all jobs)
- Supports optional query params: status, deadline
- Returns a paginated apiSuccess response with meta (total, page, pageSize)
- Returns 500 with error code INTERNAL_ERROR on unexpected failures
- Uses the apiSuccess/apiError helpers from lib/utils/apiResponse.ts
- Is in TypeScript with strict types (no any)

Do not add user_id to the query from the request body or params.
```

#### Frontend React Component

```
You are generating a React component for the ATS for Candidates project.

[Paste S1-001 Engineering Coding Standards]
[Paste S1-002 UI/UX Standards]

Story: S1-020 — Implement Basic Job Card Rendering

Task: Write the JobCard component (components/dashboard/JobCard.tsx) that:
- Accepts a Job type prop (id, title, company, location, pipelineStage, lastActivityDate, deadline?, priorityFlag?)
- Uses shadcn/ui Card, Badge components only
- Displays pipeline stage as a colour-coded Badge using stage colour tokens
- Highlights deadline in amber if within 3 days, red if overdue
- Has all five interactive states: default, hover, focus, active, disabled
- Is keyboard accessible (onClick and onKeyDown with Enter/Space)
- Uses Tailwind spacing tokens only (no arbitrary values)
- Is fully typed TypeScript with no any

Export as a named export. Include a Props interface.
```

#### Database Migration

```
You are writing a Supabase PostgreSQL migration for the ATS for Candidates project.

[Paste S1-001 Section 3.3 — Database Naming]
[Paste S1-003 Sections 3.3 and 4 — Schema and RLS]

Story: S1-019 — Implement Basic Job Entity and Storage

Task: Write the migration SQL for the jobs table that:
- Uses snake_case column names
- Has id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- Has user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- Has created_at and updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
- Has a CHECK constraint for pipeline_stage values
- Creates an index on user_id
- Enables Row Level Security
- Creates all four RLS policies (SELECT, INSERT, UPDATE, DELETE) using auth.uid() = user_id
```

#### Unit Tests

```
You are writing Jest unit tests for the ATS for Candidates project.

[Paste S1-001 Section 8 — Testing Conventions]
[Paste S1-003 Section 10 — Security Testing]

Story: S1-019 — Implement Basic Job Entity and Storage

Task: Write unit tests for lib/services/jobService.ts covering:
- Happy path: getJobById returns the job when the caller owns it
- Ownership denial: getJobById throws NotFoundError when caller does not own the job
- Unauthenticated: route handler returns 401 when no session is present
- Validation failure: createJob returns 400 when required fields are missing
- user_id injection: createJob ignores user_id in request body and uses session user.id

Mock the Supabase client. Use describe/it blocks. Test names must read as sentences.
Do not write happy-path-only tests.
```

### 3.3 Prompting Anti-Patterns to Avoid

| Anti-Pattern                                 | Why It Produces Bad Output                                       | Better Approach                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Vague task with no context docs              | AI uses generic conventions that conflict with project standards | Always attach relevant context docs before the task                             |
| Single mega-prompt for an entire feature     | Too large to review carefully; errors compound                   | Prompt for one unit at a time: one route handler, one component, one test suite |
| Asking AI to 'just make it work'             | Skips validation, errors, and ownership                          | State explicit constraints                                                      |
| Copy-pasting output without reading it       | Security bugs and invented conventions slip through              | Read every line. If you can't explain it, don't merge it.                       |
| Reusing a stale conversation for a new task  | AI carries wrong assumptions from previous context               | Start a new session for each distinct task                                      |
| Asking AI to skip tests to save time         | CI will fail; story Definition of Done is not met                | Always prompt for tests as part of implementation                               |
| Trusting AI-generated SQL without reading it | SQL is where ownership and injection vulnerabilities hide        | Read every SQL statement. Verify ownership columns and RLS policies.            |

### 3.4 Iterative Prompting

Build complex features in stages:

| Stage                 | Prompt Focus                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------- |
| 1. Types and schema   | Define TypeScript types and Zod schemas first. Review before implementation.             |
| 2. Service layer      | Implement service function with ownership check. Review and test before wiring to route. |
| 3. Route handler      | Implement API route handler. Review error handling and response envelope.                |
| 4. Unit tests         | Generate tests covering all four required categories.                                    |
| 5. Frontend component | Build the UI component. Review for shadcn/ui usage, spacing tokens, accessibility.       |
| 6. Integration        | Wire the component to the API via a custom hook. Review data flow end-to-end.            |

---

## 4. Code Review Process for AI-Generated Code

### 4.1 The Review Principle

> **Rule:** Every line of AI-generated code must be read and understood by the engineer before it is committed. "The AI wrote it" is not an accepted explanation for a bug or security defect. **The merge is the approval.**

### 4.2 Self-Review Before Committing (Author Checklist)

| Review Item                                                            | Required              |
| ---------------------------------------------------------------------- | --------------------- |
| I have read every line of the generated code                           | ✅ Required           |
| Code follows naming conventions from S1-001                            | ✅ Required           |
| TypeScript is strict — no `any`, all exports typed                     | ✅ Required           |
| No secrets or `.env` values hardcoded                                  | ✅ Required           |
| API route handler calls `supabase.auth.getUser()` first                | ✅ If API route       |
| Ownership check included in every DB query (`.eq('user_id', user.id)`) | ✅ If DB query        |
| `user_id` never sourced from request body or URL params                | ✅ If write operation |
| `apiSuccess`/`apiError` helpers used — no raw `NextResponse.json()`    | ✅ If API route       |
| shadcn/ui components used — no custom modal divs                       | ✅ If UI component    |
| Tailwind spacing tokens only — no arbitrary values                     | ✅ If UI component    |
| All five interactive states implemented                                | ✅ If interactive UI  |
| RLS policies present in migration SQL                                  | ✅ If migration       |
| Unit tests cover happy path, validation, error, and auth failure       | ✅ Required           |
| No commented-out code or debug `console.log`                           | ✅ Required           |
| I can explain what every function and query does                       | ✅ Required           |

### 4.3 Peer Review (PR Reviewer Checklist)

- **Security scan:** check for prohibited patterns from S1-003 §7. Ownership check present? 401 on unauthenticated? 404 (not 403) on ownership mismatch?
- **Type safety scan:** search for `any` or `unknown` without justification.
- **Test quality scan:** verify at least one non-happy-path test is present.
- **Convention scan:** verify naming, folder placement, and import ordering match S1-001.
- **AI-specific flag:** give extra scrutiny to error paths and edge cases — AI often produces optimistic code that handles only the happy path.

> ⚠️ **Warning:** Approving a PR containing AI-generated code that has not been read and understood is a team quality failure.

### 4.4 What to Do When AI Output Is Wrong

1. Identify the specific problem.
2. Start a new prompt session with the same context documents.
3. Describe the specific problem explicitly.
4. If the AI continues to produce incorrect output after two iterations, write that section manually.
5. **Never merge partially-correct AI output with the intent to 'fix it later'.**

---

## 5. Testing Requirements for AI-Generated Code

### 5.1 The Testing Rule

AI-generated code requires the same test coverage as human-authored code. Per TECH-SPEC §7, a story is not done unless tests cover all four required categories:

| Test Category      | What Must Be Covered                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| Happy path         | Expected inputs produce expected outputs.                                    |
| Validation failure | Invalid inputs return correct 400 response with field-level error detail.    |
| Error / exception  | Downstream failures return 500 with a safe message.                          |
| Auth and ownership | No session → 401. Wrong owner → 404. Mandatory for every protected endpoint. |

### 5.2 Prompting for Tests

Prompt for tests separately from the implementation, using the implementation code as input:

```
You are writing Jest unit tests for this function:

[Paste the service function or route handler code]

Context:
[Paste S1-001 Section 8 — Testing Conventions]
[Paste S1-003 Section 10 — Security Testing]

Write tests covering ALL of the following:
1. Happy path: correct input returns expected output
2. Validation failure: missing required fields return 400 with field errors
3. Auth failure: no session returns 401 with AUTH_REQUIRED
4. Ownership denial: authenticated user who does not own the resource gets 404
5. Downstream failure: database error returns 500 with INTERNAL_ERROR

Mock the Supabase client completely — no real network calls.
Use describe/it blocks. Test names must read as full sentences.
Do not write happy-path-only tests.
```

### 5.3 What Makes a Test Unacceptable

Per TECH-SPEC §7.5, the following are insufficient and will be rejected in PR review:

- **Happy-path-only tests** — auth failures and ownership denials are the cases that matter most.
- **Status-code-only assertions** — checking only `response.status === 200` tells us nothing.
- **Tests that call real Supabase** — unit tests must mock all external dependencies.
- **AI-generated tests with no ownership assertions** — always check for missing auth/ownership test cases.

---

## 6. Approval and Merge Process

### 6.1 PR Requirements

| Requirement                     | Detail                                                           |
| ------------------------------- | ---------------------------------------------------------------- |
| PR title includes Jira story ID | e.g., `[S1-019] Implement Basic Job Entity and Storage`          |
| PR description notes AI usage   | State which parts were AI-generated and which AI tool was used.  |
| Tech Spec sections referenced   | Per TECH-SPEC §11 — list impacted sections.                      |
| Context docs used listed        | State which S1-001 through S1-004 docs were included in prompts. |
| All CI checks pass              | Lint, type-check, build, and unit tests all green.               |
| Author self-review complete     | Author confirms they have read every line of AI-generated code.  |
| At least one peer approval      | A teammate who did not author the PR has reviewed and approved.  |
| No direct push to main          | All changes arrive via pull request. No exceptions.              |

### 6.2 PR Description Template

```markdown
## Story

[S1-XXX] Story title

## What This PR Does

Brief description of the change.

## AI Usage

- AI tool used: [Claude / GitHub Copilot / ChatGPT / Cursor / None]
- Parts generated by AI: [e.g., route handler, Zod schema, migration SQL]
- Parts written manually: [e.g., unit tests, ownership check adjustment]
- Context docs included in prompts: [e.g., S1-001, S1-003]

## Tech Spec Sections Impacted

[e.g., TECH-SPEC.md §3, §4, §7]

## Test Evidence

- [ ] Happy path test present
- [ ] Validation failure test present
- [ ] Auth failure (401) test present
- [ ] Ownership denial (404) test present
- [ ] CI checks passing

## Security / Ownership Impact

[Describe how ownership is enforced, or state 'Not applicable' with reason]
```

---

## 7. Prohibited AI Usage Patterns

| Prohibited Pattern                                              | Risk                                                                    | Required Alternative                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Merging AI code that has not been read                          | Security defects go undetected                                          | Read every line before committing.                                  |
| Using AI to generate fake third-party API integrations          | Violates PRD §4.4 — AI must not simulate unavailable APIs               | Build only integrations defined in scope.                           |
| AI-generating RLS policies with public SELECT                   | Unauthenticated users can read the entire table                         | Review every RLS policy. Ensure `auth.uid() = user_id`.             |
| Prompting AI without context docs for security-sensitive code   | AI will omit ownership checks or trust client `user_id`                 | Always include S1-003 in prompts for backend/database code.         |
| AI-generating environment values or secrets inline              | Secrets committed to git create a permanent breach record               | Verify output contains no hardcoded secrets.                        |
| Using AI to write tests after the fact to hit a coverage target | Tests written to match existing code produce meaningless coverage       | Prompt for tests based on feature requirements, not implementation. |
| AI-generating direct database access in React components        | Violates architecture boundaries; bypasses server-side ownership checks | All DB access goes through API route handlers.                      |

---

## 8. Jira Traceability for AI-Assisted Work

| Artefact        | Required Content                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Jira story      | References relevant Tech Spec sections. Definition of Done includes test and ownership checks. |
| Jira sub-tasks  | Note AI tool used in the sub-task description.                                                 |
| Pull request    | References story ID in title. PR description completed per Section 6.2 template.               |
| Commit messages | Follow Conventional Commits format from S1-001 §9.2.                                           |

**Suggested Jira custom fields:**

- `Tech Spec Sections` — e.g., §3, §4, §7
- `Test Evidence` — link or description of test coverage
- `Security/Ownership Impact` — brief description or 'N/A'
- `AI Tool Used` — e.g., Claude Sonnet 4, GitHub Copilot, None

---

## 9. Sprint Application Guidance

### Sprint 1 — Establish the Pattern

- S1-001 through S1-004 must be in `docs/` before any feature coding begins.
- Start with low-risk units: use AI for boilerplate first (Zod schemas, TypeScript types, migration SQL structure).
- **Ownership checks are non-negotiable in Sprint 1** — the demo requires demonstrating backend ownership enforcement.

### Sprint 2 — Scale with Discipline

- AI can be used more broadly for dashboard workflow features and profile completion.
- The author self-review checklist (Section 4.2) remains mandatory on every AI-generated PR.
- AI-generated test suites must still be inspected for missing auth/ownership cases.

### Sprint 3 — Harden and Deploy

- Use AI for deployment config and GitHub Actions improvements — but review CI/CD output extremely carefully.
- Smoke-test AI-assisted deployment changes in a staging environment before merging to main.
- Do not use AI to generate analytics from fabricated data — analytics must be derived from real stored fields.

---

## 10. Product AI Feature Integration Standards

### 10.1 Permitted AI Feature Scope

| Permitted AI Feature                | API Endpoint                                      |
| ----------------------------------- | ------------------------------------------------- |
| Resume bullet rewriting             | `POST /api/ai/generate-resume`                    |
| Resume tailoring to job description | `POST /api/ai/generate-resume` (with job context) |
| Cover letter generation             | `POST /api/ai/generate-cover-letter`              |

> ⚠️ **Warning:** AI is not permitted as a substitute for unavailable external APIs, as a source of fabricated data, or as a hidden automation layer. Per PRD §4.4, fake integrations are prohibited.

### 10.2 AI Provider Configuration

| Provider           | Model Recommendation         | Key Environment Variable |
| ------------------ | ---------------------------- | ------------------------ |
| Gemini (Google)    | `gemini-2.5-pro` (free tier) | `GEMINI_API_KEY`         |
| Claude (Anthropic) | `claude-sonnet-4-6`          | `ANTHROPIC_API_KEY`      |
| ChatGPT (OpenAI)   | `gpt-4o-mini`                | `OPENAI_API_KEY`         |

- All AI API keys are **server-side only**. Never prefix with `NEXT_PUBLIC_`.
- Provider selection is controlled by an `AI_PROVIDER` environment variable.

### 10.3 AI Feature Implementation Standards

- **User-triggered only:** AI generation must be initiated by an explicit user action.
- **Profile data as input:** AI inputs must be traceable to the user's own profile data and job context.
- **Output is a draft:** the user must be able to edit AI output before saving.
- **Output is versioned:** saved AI content is stored as a `DocumentVersion` with ownership.
- **Minimal logging:** log only provider, model name, operation type, and user UUID. Never log prompt content or profile data.
- **Graceful failure:** if the AI provider errors or times out, return `AI_UNAVAILABLE`. Do not crash the page.

### 10.4 AI Feature Prompt Construction

```typescript
// aiService.ts — prompt construction pattern
export async function generateCoverLetter(profile: UserProfile, job: Job): Promise<string> {
  const prompt = buildCoverLetterPrompt(profile, job); // server-side builder
  try {
    const result = await callAIProvider(prompt);
    logger.info('cover_letter_generated', {
      userId: profile.userId, // UUID only, no PII
      provider: AI_PROVIDER,
      model: AI_MODEL,
    });
    return result;
  } catch (error) {
    logger.error('ai_generation_failed', { error: error.message });
    throw new AIUnavailableError('AI generation failed');
  }
}
```

> **Rule:** The `buildCoverLetterPrompt()` function must sanitise profile data before injecting it into the prompt. Never directly interpolate raw user text into a prompt string without sanitisation.

### 10.5 AI Feature Testing Requirements

- **Unit test the prompt builder:** verify prompts are correctly structured from known inputs.
- **Unit test the error path:** verify that AI provider failure throws `AIUnavailableError` and the route handler returns `503` with `AI_UNAVAILABLE`.
- **Do not call real AI APIs in unit tests.** Mock the AI provider client completely.
- **Test that output is not auto-saved:** verify the generate endpoint returns draft text only.

---

## 11. Document Maintenance

- **Owner:** Engineering team collectively
- **Review cadence:** Start of each sprint; immediately if a workflow gap is identified
- **Location in repo:** `docs/S1-004-ai-prompting-review.md`

> **Final Reminder:** AI tools are multipliers, not replacements. A good engineer using AI well produces better results faster. A careless engineer using AI without review produces bugs faster. The discipline in this document — always include context docs, always read the output, always test all four categories, always check ownership — is what keeps the multiplier positive.
