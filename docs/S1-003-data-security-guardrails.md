# S1-003 — Data & Security Guardrails

**ATS for Candidates | NJIT CS490 Capstone | Sprint 1 | Spring 2026**

| Field              | Detail                                                          |
| ------------------ | --------------------------------------------------------------- |
| Story ID           | S1-003                                                          |
| Sprint             | Sprint 1 — Dashboard Foundation, Auth, CI/CD & Profile Baseline |
| Status             | Published                                                       |
| Tech Spec Sections | TECH-SPEC.md §§3, 4, 7, 10                                      |
| Companion Docs     | S1-001 Engineering Coding Standards, Sprint1Demo.md §B1         |
| Audience           | All engineers + AI coding assistants                            |

---

## 1. Purpose and Scope

This document defines the data ownership model, authorization rules, protected route behaviour, and prohibited cross-user access patterns for the ATS for Candidates project.

Security and data isolation are **not optional**. The Sprint 1 demo explicitly requires demonstrating that User B cannot view or modify User A's data, and that backend ownership enforcement is visible in code. A missing or broken ownership check is a **major deduction** in the demo rubric.

> ⚠️ **Warning:** No implementation is complete without authorization and ownership enforcement. Frontend route guards are required but are **not** the authoritative security layer. Backend ownership checks in API route handlers and service functions are the **authoritative enforcement layer**. Both are required.

> **AI Tip:** When generating any API route handler, service function, or database query, always include ownership enforcement. Never assume the caller is the owner. Never trust `user_id` from the request body.

---

## 2. Authentication Platform

### 2.1 Supabase Auth Overview

| Aspect           | Detail                                                                      |
| ---------------- | --------------------------------------------------------------------------- |
| Auth provider    | Supabase Auth (built on GoTrue)                                             |
| Session storage  | HTTP-only cookies managed by `@supabase/ssr`                                |
| Token type       | JWT with `sub` claim = `auth.users.id` (UUID)                               |
| Password hashing | Handled by Supabase Auth (bcrypt). Never implement custom hashing.          |
| Identity column  | `auth.users.id` (UUID) is the authoritative user identity across all tables |
| Client package   | `@supabase/supabase-js` + `@supabase/ssr` for Next.js App Router            |

### 2.2 Supabase Client Instances

| Client              | File Location + Use                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Browser client      | `lib/supabase/client.ts` — used in React components and client-side hooks. Subject to RLS.                             |
| Server client       | `lib/supabase/server.ts` — used in API route handlers. Reads session from cookies. Subject to RLS.                     |
| Service role client | `lib/supabase/admin.ts` — **bypasses RLS**. Use ONLY for admin/migration scripts. NEVER in user-facing route handlers. |

> ⚠️ **Warning:** Never import the service role client in a user-facing API route handler. It bypasses all Row Level Security policies.

### 2.3 Session Retrieval Pattern

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } },
  );
}

// Pattern for every protected route handler
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return apiError('AUTH_REQUIRED', 401);
  }

  const ownerId = user.id; // verified owner identity for all downstream checks
}
```

---

## 3. Domain Data Model and Ownership

### 3.1 Core Domain Entities

| Entity          | Postgres Table       | Ownership Column                           |
| --------------- | -------------------- | ------------------------------------------ |
| User            | `auth.users`         | `id` (is the owner)                        |
| Profile         | `profiles`           | `user_id → auth.users.id`                  |
| Job             | `jobs`               | `user_id → auth.users.id`                  |
| Document        | `documents`          | `user_id → auth.users.id`                  |
| DocumentVersion | `document_versions`  | Inherited via `document_id → documents.id` |
| JobActivity     | `job_activities`     | Inherited via `job_id → jobs.id`           |
| JobDocumentLink | `job_document_links` | Inherited via `job_id → jobs.id`           |

### 3.2 Ownership Relationships

| Relationship                                | Meaning                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| User 1:1 Profile                            | Each user has exactly one profile.                                         |
| User 1:N Job                                | A user owns all their job records. No job is accessible to any other user. |
| User 1:N Document                           | A user owns all their documents.                                           |
| Document 1:N DocumentVersion                | Ownership checked at the document level.                                   |
| Job 1:N JobActivity                         | Ownership checked at the job level.                                        |
| Job N:N DocumentVersion via JobDocumentLink | Caller must own both the job AND the document.                             |

> **Rule:** Ownership of a child entity is always verified through its parent. Never store a redundant `user_id` on child tables — verify the ownership chain instead.

### 3.3 Database Schema Guardrails

- Every user-scoped table must have `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- All tables must have `created_at` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- Primary keys must be UUIDs: `DEFAULT gen_random_uuid()`.
- Index all `user_id` columns.

```sql
-- Example: jobs table with correct ownership structure
CREATE TABLE jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  company      TEXT NOT NULL,
  pipeline_stage TEXT NOT NULL DEFAULT 'Interested',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
```

---

## 4. Row Level Security (RLS)

### 4.1 RLS Policy Requirement

All user-scoped tables in Supabase **must** have Row Level Security enabled. RLS is a database-level backstop — it is a defence-in-depth measure, not a substitute for service-layer ownership checks.

### 4.2 Standard RLS Policy Pattern

```sql
-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- SELECT: user can only read their own rows
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: user_id must equal the authenticated user
CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can only update their own rows
CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: user can only delete their own rows
CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);
```

### 4.3 RLS for Child Tables

```sql
-- document_versions: ownership checked through parent document
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document versions"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
        AND documents.user_id = auth.uid()
    )
  );
```

> **Note:** Repeat the same EXISTS subquery pattern for INSERT, UPDATE, and DELETE on all child tables.

---

## 5. Backend Authorization Checks

### 5.1 The Ownership Check Principle

> **Rule:** Never fetch a resource and then check if the returned row's `user_id` matches the caller. Include `WHERE user_id = :ownerId` in the query itself.

### 5.2 Ownership Check Pattern — Direct Tables

```typescript
// jobService.ts — correct ownership enforcement
export async function getJobById(jobId: string, ownerId: string) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', ownerId) // ownership enforced in the query
    .single();

  if (error || !data) {
    throw new NotFoundError('Job not found'); // never reveal ownership mismatch
  }
  return data;
}
```

### 5.3 Write Operation Ownership Rules

- **INSERT:** always set `user_id` from `session.user.id`, never from the request body.
- **UPDATE:** include `WHERE user_id = :ownerId` in the update query.
- **DELETE:** include ownership check in the delete query.
- **JobDocumentLink:** verify the caller owns both the job AND the document.

```typescript
// Correct INSERT pattern — user_id from session, not request body
const { data } = await supabase
  .from('jobs')
  .insert({ title, company, location, user_id: user.id }) // from session
  .select()
  .single();
```

### 5.4 Authorization Error Response Rules

| Situation                                                  | Correct Response                           |
| ---------------------------------------------------------- | ------------------------------------------ |
| No valid session                                           | `401` with `AUTH_REQUIRED`                 |
| Authenticated but resource not found or ownership mismatch | `404` with `NOT_FOUND` — do NOT return 403 |
| Explicitly forbidden (admin features)                      | `403` with `FORBIDDEN`                     |
| user_id in request body                                    | `400` — strip the field                    |

> **Rule:** Return `404` (not `403`) when an authenticated user requests a resource that belongs to someone else. Returning `403` reveals that the resource exists, which is an information leak.

---

## 6. Protected Route Behaviour

### 6.1 Route Classification

| Route Category       | Examples                                                  | Protection Required                                                  |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Public routes        | `/login`, `/register`, `/reset-password`                  | None. Redirect authenticated users away from login.                  |
| Protected pages      | `/dashboard`, `/profile`, `/documents`, `/settings`       | Must verify session. Redirect to `/login` if no session.             |
| Protected API routes | `/api/jobs/*`, `/api/profile`, `/api/documents/*`         | Must call `supabase.auth.getUser()` first. Return 401 if no session. |
| Auth API routes      | `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout` | No session check. Handle Supabase Auth operations.                   |

### 6.2 Frontend Route Protection (Next.js Middleware)

```typescript
// middleware.ts (project root)
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => request.cookies.get(n)?.value,
        set: (n, v, o) => response.cookies.set(n, v, o),
        remove: (n, o) => response.cookies.delete({ name: n, ...o }),
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register');
  const isProtected = !isAuthPage && !request.nextUrl.pathname.startsWith('/api/auth');

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 6.3 Redirect Behaviour Rules

- **Unauthenticated → protected page:** redirect to `/login`. Preserve originally requested URL as `?next=` param.
- **Authenticated → `/login` or `/register`:** redirect to `/dashboard`.
- **Successful login:** redirect to `/dashboard` or the `?next=` URL.
- **Logout:** call `supabase.auth.signOut()` server-side, clear cookies, redirect to `/login`.

---

## 7. Prohibited Cross-User Access Patterns

> ⚠️ **Warning:** These patterns are inspected during code review and during the Sprint 1 demo (Phase B – B1). Any of these found in merged code is a **security defect**, not a style issue.

| Prohibited Pattern                               | Why It Is Dangerous                                           | Required Fix                                                            |
| ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Fetch all rows, filter in application code       | Returns ALL users' data from the DB                           | Add `.eq('user_id', ownerId)` to the query                              |
| Trust `user_id` from request body or URL param   | Attacker supplies another user's ID                           | Always source `user_id` from session (`user.id`)                        |
| Use service role client in route handler         | Bypasses RLS; any authenticated user gets all rows            | Use server client. Reserve service role for admin scripts only.         |
| Return `403` on ownership mismatch               | Reveals that the resource exists                              | Return `404` — treat another user's resources as non-existent           |
| No ownership check on child entity               | User can access activities for jobs they don't own            | Check ownership through parent                                          |
| No backend ownership check (frontend-only guard) | Client-side guard is trivially bypassed with direct API calls | Always check `supabase.auth.getUser()` in every protected route handler |
| Include other users' data in list responses      | List endpoint returns rows from all users                     | Every list query must include `.eq('user_id', user.id)`                 |
| Logging PII or auth tokens                       | Log files become a data breach vector                         | Log only UUIDs, routes, timestamps, error codes                         |

---

## 8. API Security Conventions

- **Validate every request body** with a Zod schema before any business logic runs.
- **Strip unexpected fields** — Zod schemas use `.strip()` (default) to remove undeclared fields.
- **Never trust client-supplied IDs** for ownership.
- **URL parameter IDs** must be validated as valid UUIDs before use in queries.
- **Never log** auth tokens, JWTs, passwords, or PII.
- **Never return** stack traces, password hashes, or Supabase internal fields in API responses.

---

## 9. Settings and Account Management Security

| Operation         | Security Requirement                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Change email      | Require current password confirmation. Send confirmation email to new address first.                        |
| Change password   | Use `supabase.auth.updateUser({ password: newPassword })` — never update directly in DB.                    |
| Delete account    | Require current password + explicit confirmation dialog. Cascades to all user data via `ON DELETE CASCADE`. |
| View account info | Sourced entirely from session — no `user_id` parameter accepted.                                            |

---

## 10. Security Testing Requirements

### 10.1 Required Test Categories

| Test Category                | What Must Be Tested                                                      |
| ---------------------------- | ------------------------------------------------------------------------ |
| Unauthenticated access       | Route handler returns `401` when no valid session is present.            |
| Ownership — read             | User B cannot read User A's Job, Profile, or Document. Returns `404`.    |
| Ownership — write            | User B cannot update or delete User A's records. Returns `404`.          |
| Ownership — child            | User B cannot access JobActivities belonging to User A's jobs.           |
| user_id injection prevention | Request body containing `user_id` is ignored; session `user.id` is used. |

### 10.2 Test Pattern

```typescript
describe('GET /api/jobs/:id', () => {
  it('returns 404 when authenticated user does not own the job', async () => {
    const userAJob = await createTestJob({ userId: USER_A_ID });

    const response = await makeAuthenticatedRequest('GET', `/api/jobs/${userAJob.id}`, {
      userId: USER_B_ID,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 when request has no session', async () => {
    const response = await makeUnauthenticatedRequest('GET', '/api/jobs/any-id');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });
});
```

### 10.3 Sprint 1 Demo Evidence Checklist (B1)

| Demo Requirement                              | Guardrail That Covers It                                               |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Show User B cannot view or modify User A data | Section 5.2 — `.eq('user_id', ownerId)` in service query               |
| Show one backend enforcement point in code    | Section 5.2 — `getJobById` service function; Section 6.2 — middleware  |
| Show deny behavior (404)                      | Section 5.4 — return `404` for ownership mismatch                      |
| Show one unit test asserting ownership denial | Section 10.2 — ownership denial test                                   |
| Two test accounts (User A and User B)         | Section 3.1 — both users have own isolated rows; seed data before demo |

> ⚠️ **Warning:** No ownership/isolation proof results in a major deduction (6 of 15 points). Prepare User A and User B test accounts and seed data before demo day.

---

## 11. Supabase-Specific Security Rules

| Rule                      | Detail                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Enable RLS on every table | `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;` must be in every migration.         |
| No public SELECT policies | Never allow unauthenticated (anon) users to read any user-scoped table.              |
| Anon key is public        | The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is visible in the browser. RLS must be airtight. |
| `auth.uid()` in policies  | Use `auth.uid()` in RLS policies — this is the session-verified user ID.             |
| Supabase Storage          | Apply Storage policies that mirror RLS: users can only access their own file paths.  |

---

## 12. Document Maintenance

- **Owner:** Engineering team collectively
- **Review cadence:** Start of each sprint; immediately if a security gap is discovered
- **Location in repo:** `docs/S1-003-data-security-guardrails.md`

> **AI Reminder:** When generating any code that reads, writes, updates, or deletes a resource, always include: (1) `supabase.auth.getUser()` session verification, (2) `.eq('user_id', user.id)` ownership enforcement in the query, (3) `401` for unauthenticated requests, (4) `404` for ownership mismatches. Never trust `user_id` from the request body.
