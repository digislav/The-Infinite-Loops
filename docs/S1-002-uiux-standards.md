# S1-002 — UI/UX Standards

**ATS for Candidates | NJIT CS490 Capstone | Sprint 1 | Spring 2026**

| Field              | Detail                                                          |
| ------------------ | --------------------------------------------------------------- |
| Story ID           | S1-002                                                          |
| Sprint             | Sprint 1 — Dashboard Foundation, Auth, CI/CD & Profile Baseline |
| Status             | Published                                                       |
| Tech Spec Sections | TECH-SPEC.md §5 (UI Implementation Standards)                   |
| Companion Docs     | UX.md, S1-001 Engineering Coding Standards                      |
| Audience           | All engineers, designers + AI coding assistants                 |

---

## 1. Purpose and Scope

This document defines the UI/UX standards for the ATS for Candidates project. It translates the product-level UX direction in `UX.md` into concrete, actionable rules for engineers and AI coding assistants.

These standards ensure one thing: **the app feels like a single, coherent product from end to end** — not three sprint submissions stitched together. Every component built, every screen wired, and every interaction designed must be traceable back to the conventions defined here.

> **AI Tip:** When generating UI code for this project, apply every convention in this document. Never invent new interaction patterns, spacing scales, or color values.

---

## 2. Product Experience Direction

The app is candidate-centered. The three qualities that define a successful UX:

| Quality         | What It Means in Practice                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Consistency** | Repeated actions work the same way throughout the app. Button placement, form behaviour, status indicators, and navigation never surprise the user. |
| **Clarity**     | Users always understand what they can do and what just happened. Empty states explain themselves. Errors identify the problem.                      |
| **Flow**        | Users can move from profile data to job actions to document outcomes without getting lost or being pushed between disconnected screens.             |

---

## 3. Navigation Model

### 3.1 Chosen Navigation Pattern

The team selects **one** of the following at project kickoff and applies it without deviation:

| Pattern                  | Description                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Option A — Left Side Nav | Persistent vertical navigation rail on the left. Recommended for dashboard-heavy apps. |
| Option B — Top Nav Bar   | Horizontal navigation bar across the top.                                              |
| Option C — Hybrid        | Top bar for branding/user controls + left rail for primary destinations.               |

> ⚠️ **Team Decision:** The team has selected Option B — Top Nav Bar as the application’s primary navigation pattern for Sprint 1. All core screens must follow this navigation model consistently. This decision is locked for Sprint 1 and may only be changed after a formal team review and update to the UI/UX standards document..
>
> **Chosen pattern:** ****\*\*\*\*****\_\_\_****\*\*\*\*****

### 3.2 Primary Navigation Destinations

| Destination      | Route        | Notes                                   |
| ---------------- | ------------ | --------------------------------------- |
| Dashboard        | `/dashboard` | Home page. Default landing after login. |
| Document Library | `/documents` | Global document management.             |
| Profile          | `/profile`   | User profile management.                |
| Settings         | `/settings`  | Account and app settings.               |

### 3.3 Navigation Rules

- **Never switch navigation patterns** mid-app.
- **Active state** must be clearly indicated for the current destination.
- **Auth pages** (login, register, reset password) use a stripped layout with no primary navigation.
- **Mobile nav** must collapse gracefully — hamburger menu or bottom tab bar.
- **No nested primary nav.** Sub-sections use in-page tabs or scroll anchors.
- **Logo/brand mark** must always link back to `/dashboard`.

---

## 4. Dashboard and Job Board Interaction Model

### 4.1 Chosen Interaction Paradigm

| Model                   | Description                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Option A — Card Grid    | Jobs displayed as cards in a responsive grid. Clicking opens inline detail panel or modal. |
| Option B — Kanban Board | Jobs arranged in columns by pipeline stage. Cards draggable between stages.                |
| Option C — List View    | Jobs as a dense table/list with sortable columns.                                          |

> ⚠️ **Team Decision:** The team has selected Option C — List View as the dashboard interaction model for Sprint 1. Job applications will be displayed in a structured list/table format to support efficient scanning, sorting, and management of multiple records. This decision is locked for Sprint 1 and cannot be changed without team review.

> **Chosen model:** ****\*\*\*\*****\_\_\_****\*\*\*\*****

### 4.2 Dashboard Layout Zones

| Zone             | Content                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| Dashboard Header | Page title, quick search input, primary action button (Add Job / Import Job)        |
| Stats Bar        | Summary counts: Total, Applied, Interview, Offer, Rejected, Archived, Response Rate |
| Board Controls   | Filter controls (stage, status, location, company), sort options                    |
| Board Content    | Job cards / Kanban columns / list rows                                              |

### 4.3 Job Card — Required Fields

Every job item must display at minimum:

- Job title (most prominent)
- Company name
- Location
- Current pipeline stage with a colour-coded status indicator
- Last activity date
- Deadline (if set) — highlight if within 3 days
- Priority flag (if set)

### 4.4 Job Detail Experience

A job item must open into a detail view. Options:

- **Inline expansion:** card expands in place (accordion pattern)
- **Slide-over panel:** detail panel slides in from the right
- **Detail page:** dedicated route `/dashboard/jobs/:id` with breadcrumb back

The job detail view must provide access to: all job fields (editable), pipeline stage selector, interview/activity log, linked document versions, custom notes.

> ⚠️ **Warning:** Do not place job detail actions in a disconnected page with no navigation path back to the dashboard.

### 4.5 Pipeline Stage Colours

Define these as tokens in `tailwind.config.ts` under `theme.extend.colors.stage`:

| Stage      | Colour Token       | Tailwind                |
| ---------- | ------------------ | ----------------------- |
| Interested | `stage-interested` | `indigo-500` (#6366F1)  |
| Applied    | `stage-applied`    | `blue-500` (#3B82F6)    |
| Interview  | `stage-interview`  | `amber-500` (#F59E0B)   |
| Offer      | `stage-offer`      | `emerald-500` (#10B981) |
| Rejected   | `stage-rejected`   | `red-500` (#EF4444)     |
| Archived   | `stage-archived`   | `gray-400` (#9CA3AF)    |

---

## 5. Component Usage Rules

### 5.1 Component Library

- Always use a **shadcn/ui** primitive when one exists.
- Do **not** install additional component libraries (MUI, Chakra, Ant Design).
- Do **not** modify files inside `components/ui/` (the shadcn primitives).
- Keep shadcn component variants consistent across the app.

### 5.2 Button Rules

| Button Type           | When to Use                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| Primary (`default`)   | The single most important action on a surface. Maximum one per section.       |
| Secondary (`outline`) | Important but not primary action.                                             |
| Ghost / Text          | Low-emphasis actions.                                                         |
| Destructive           | Delete, remove, archive actions only. Always pair with a confirmation dialog. |
| Icon-only             | Compact actions. Must have an accessible `aria-label`.                        |
| Loading state         | Show spinner inside button and disable while async action is in flight.       |

- **Primary action buttons** appear at top-right of a section header or bottom-right of a form.
- **Destructive actions** must be separated visually from non-destructive actions.

### 5.3 Form Rules

- Use **controlled inputs** throughout. Never uncontrolled/ref-only forms.
- Every form field must have a **label** using the shadcn `Label` component.
- **Validation** runs on submit and on blur for required fields. Show inline errors below the offending field using `FormMessage`.
- **Required fields** marked with red asterisk (\*). Optional fields marked with "(optional)".
- **Save/Submit buttons** show a loading spinner while in flight and are disabled until complete.
- **Preserve unsaved data** on network failure — do not reset the form.
- **Success state** acknowledged via toast notification or inline confirmation.

### 5.4 Modal and Dialog Rules

- Use the **shadcn Dialog** component for all modal interactions.
- Modals must have a clear title and close button (X) in the top-right corner.
- **Destructive confirmation dialogs** must include: description of what will be deleted, Cancel button, red Destructive action button.
- Do **not** stack modals.

### 5.5 Status Indicators and Badges

- Use the **shadcn Badge** component for all status/stage/category labels.
- Badge colours must use the pipeline stage colour tokens from Section 4.5.
- Use the **shadcn Skeleton** component for content loading placeholders.

### 5.6 Toast Notifications

- Use a **single toast provider** (Sonner recommended) at the app root.
- Success toasts: green, auto-dismiss after 4 seconds.
- Error toasts: red, auto-dismiss after 6 seconds.
- Do **not** use toasts for form validation errors — those belong inline.

### 5.7 Empty States

Every list, board, or table that can contain zero items must have an empty state that includes:

- An icon or illustration (Lucide icon is sufficient)
- A short explanatory message
- A primary action button when applicable
- Never show a blank white box

---

## 6. Spacing and Layout

### 6.1 Spacing Scale

Use Tailwind's default spacing scale exclusively. No arbitrary pixel values (e.g., `mt-[17px]`).

| Token      | Value | Common Use                           |
| ---------- | ----- | ------------------------------------ |
| `space-1`  | 4px   | Tight internal gaps                  |
| `space-2`  | 8px   | Between label and input              |
| `space-4`  | 16px  | Standard card padding, list item gap |
| `space-6`  | 24px  | Section gap within a page            |
| `space-8`  | 32px  | Between major layout sections        |
| `space-12` | 48px  | Page header to content gap           |

### 6.2 Page Layout

- **Content max-width:** `max-w-7xl` (1280px) centered.
- **Page padding:** `px-6` on mobile, `px-8` on desktop.
- **Section spacing:** `gap-8` or `space-y-8` between major sections.
- **Card padding:** `p-4` (compact) or `p-6` (standard).

### 6.3 Responsive Breakpoints

| Tailwind Prefix | Min Width | Target Device               |
| --------------- | --------- | --------------------------- |
| (none)          | 0px       | Mobile — base styles        |
| `sm:`           | 640px     | Large mobile / small tablet |
| `md:`           | 768px     | Tablet                      |
| `lg:`           | 1024px    | Desktop (primary target)    |
| `xl:`           | 1280px    | Large desktop               |

- **Desktop-first:** design and implement at `lg:` first, then add responsive overrides.
- Core workflows must remain **usable** on mobile — not pixel-perfect, but functional.

---

## 7. Typography

### 7.1 Font Stack

| Role         | Font                                                               |
| ------------ | ------------------------------------------------------------------ |
| Primary (UI) | Inter (via `next/font/google`). Fallback: `system-ui, sans-serif`. |
| Monospace    | JetBrains Mono (for code snippets only).                           |

### 7.2 Type Scale

| Token       | Size | Use                             |
| ----------- | ---- | ------------------------------- |
| `text-xs`   | 12px | Labels, meta info, timestamps   |
| `text-sm`   | 14px | Body text in cards, table cells |
| `text-base` | 16px | Default body text, form inputs  |
| `text-lg`   | 18px | Sub-headings, card titles       |
| `text-xl`   | 20px | Section headings                |
| `text-2xl`  | 24px | Page headings (h2-level)        |
| `text-3xl`  | 30px | Primary page title (h1-level)   |

### 7.3 Font Weight

- `font-normal` (400): body text, descriptions
- `font-medium` (500): labels, nav items, button text
- `font-semibold` (600): card titles, section headings, form labels
- `font-bold` (700): page titles, primary headings only

### 7.4 Text Colour

- Primary text: `text-gray-900`
- Secondary / muted text: `text-gray-500` or `text-muted-foreground`
- Error text: `text-red-600`
- Success text: `text-emerald-600`
- Never use raw hex values inline — always use Tailwind colour tokens.

---

## 8. Colour Palette

Define all colours in `tailwind.config.ts`. Reference only as Tailwind classes.

| Name          | Hex       | Usage                               |
| ------------- | --------- | ----------------------------------- |
| Brand Primary | `#2E75B6` | Primary actions, active nav, links  |
| Brand Dark    | `#1F4E79` | Page headings, heavy emphasis       |
| Brand Light   | `#D9E2F3` | Table headers, selected backgrounds |
| Surface       | `#FFFFFF` | Card and panel backgrounds          |
| Background    | `#F8F9FC` | Page background                     |
| Border        | `#E5E7EB` | Card borders, dividers              |
| Text Primary  | `#111827` | Main body text                      |
| Text Muted    | `#6B7280` | Secondary text                      |
| Success       | `#10B981` | Success states, offer stage         |
| Warning       | `#F59E0B` | Interview stage, deadlines          |
| Error         | `#EF4444` | Errors, rejected stage              |
| Info          | `#3B82F6` | Applied stage, info states          |

> **Note:** Dark mode is out of scope for Sprint 1.

### 8.1 Accessibility Contrast

- All text must meet WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text.
- Never use light grey text on white backgrounds for meaningful content.
- Check colour combinations with a contrast checker before committing new pairings.

---

## 9. Interaction and Feedback States

### 9.1 Required States for Interactive Elements

| State    | Requirement                                                                  |
| -------- | ---------------------------------------------------------------------------- |
| Default  | Clearly looks interactive                                                    |
| Hover    | Visible change — use `transition-colors duration-150`                        |
| Focus    | Visible focus ring — do not suppress with `outline-none` without replacement |
| Active   | Slight pressed visual feedback on click                                      |
| Disabled | `opacity-50 cursor-not-allowed`. Must not respond to click events.           |

### 9.2 Loading States

- **Inline loaders** (buttons): spinner inside the element, element disabled.
- **Content loaders** (data fetching): shadcn Skeleton placeholders.
- **Never show a blank white box** while data is loading.

### 9.3 Confirmation Patterns

- **Destructive actions** (delete, archive) require a confirmation dialog before executing.
- **Non-destructive actions** (save, update) use a success toast instead.

### 9.4 Animation and Transitions

- Use only Tailwind's built-in transition utilities: `transition`, `transition-colors`, `duration-150`, `duration-200`.
- Do not add complex animation libraries without team discussion.

---

## 10. Accessibility Standards

- **Keyboard navigation:** all primary actions must be accessible via keyboard alone.
- **Tab order:** logical left-to-right, top-to-bottom. Never use `tabIndex` values greater than 0.
- **Focus management:** when a modal opens, focus moves to the modal; when it closes, focus returns to the trigger.
- **Form labels:** every input has an associated label via `htmlFor`.
- **Icon buttons:** every icon-only button has `aria-label`. Decorative icons use `aria-hidden={true}`.
- **Images:** all meaningful images have `alt` text. Decorative images use `alt=""`.

---

## 11. Profile Page UX

- **Section-based layout:** Profile is divided into named sections, each independently editable and saveable.
- **Section navigation:** use in-page tab bar or sticky left sub-nav to jump between sections.
- **Completion indicator:** visible on the Profile page header. Updates immediately after save.
- **Independent section saves:** saving Experience should not re-POST the entire profile.
- **Unsaved changes indicator:** show a subtle visual cue when a section has been edited but not saved.

---

## 12. Consistency Rules

| Rule                        | Requirement                                                           |
| --------------------------- | --------------------------------------------------------------------- |
| One navigation pattern      | Chosen at kickoff. Never changes mid-app.                             |
| One dashboard model         | Chosen at kickoff. Never changes mid-app.                             |
| One toast provider          | Single Sonner instance at app root.                                   |
| One modal system            | shadcn Dialog only. No custom modals.                                 |
| One form validation library | React Hook Form + Zod. No other form libraries.                       |
| Consistent action placement | Primary buttons top-right of section header or bottom-right of forms. |
| Consistent empty states     | Every list/table/board with zero items shows an empty state with CTA. |
| Consistent error messages   | Inline for form fields. Toast for async failures.                     |
| No orphan pages             | Every screen is reachable from and returns to primary navigation.     |

### PR Design Review Checklist

Before merging any PR that includes a new screen or component, confirm:

- [ ] Navigation pattern matches the chosen model
- [ ] Spacing uses only Tailwind scale tokens (no arbitrary values)
- [ ] Typography uses only the defined type scale
- [ ] Colours use only the defined palette tokens
- [ ] All interactive elements have all five states
- [ ] Forms have labels, inline validation, and success/error feedback
- [ ] Destructive actions have a confirmation dialog
- [ ] Empty states implemented for all lists/boards
- [ ] Component is keyboard-navigable
- [ ] No hardcoded hex values or pixel values in JSX

---

## 13. Document Maintenance

- **Owner:** Engineering team collectively
- **Review cadence:** Start of each sprint; ad hoc when a gap is identified
- **Location in repo:** `docs/S1-002-uiux-standards.md`

> **AI Reminder:** This document is the authoritative UI/UX standard for this project. When generating component or page code, always apply the spacing scale, colour tokens, component usage rules, and interaction state requirements defined here.
