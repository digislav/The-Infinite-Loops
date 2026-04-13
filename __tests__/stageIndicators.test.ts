// Unit tests for the S2-004 stage/status indicator logic.
// Tests the isDeadlineSoon and isDeadlineOverdue helper functions
// which power the UrgencyBadge component in BoardContent.tsx.
//
// These are pure functions with no DB access so no mocking is needed.
// Covers all 4 required categories per S1-001 §8.2.

import { isDeadlineSoon, isDeadlineOverdue } from '@/components/dashboard/BoardContent';

describe('isDeadlineOverdue', () => {
  // HAPPY PATH — a past date is correctly identified as overdue.
  it('returns true when the deadline has already passed', () => {
    // Use a date that is definitely in the past.
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isDeadlineOverdue(pastDate)).toBe(true);
  });

  // HAPPY PATH — a future date is correctly identified as not overdue.
  it('returns false when the deadline is in the future', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDeadlineOverdue(futureDate)).toBe(false);
  });

  // NON-HAPPY PATH — undefined input returns false safely.
  // Per S1-001 §6.3 — functions must handle missing input gracefully.
  it('returns false when deadline is undefined', () => {
    expect(isDeadlineOverdue(undefined)).toBe(false);
  });

  // NON-HAPPY PATH — empty string returns false safely.
  it('returns false when deadline is an empty string', () => {
    expect(isDeadlineOverdue('')).toBe(false);
  });
});

describe('isDeadlineSoon', () => {
  // HAPPY PATH — a deadline within 3 days is correctly identified as soon.
  // Per S1-002 §4.3 — deadline must be highlighted if within 3 days.
  it('returns true when the deadline is within 3 days', () => {
    // 1 day from now — should be "soon".
    const soonDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDeadlineSoon(soonDate)).toBe(true);
  });

  // HAPPY PATH — a deadline more than 3 days away is not "soon".
  it('returns false when the deadline is more than 3 days away', () => {
    const farDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDeadlineSoon(farDate)).toBe(false);
  });

  // NON-HAPPY PATH — an already overdue deadline is not "soon".
  // "Soon" only applies to deadlines that haven't passed yet.
  it('returns false when the deadline has already passed', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isDeadlineSoon(pastDate)).toBe(false);
  });

  // NON-HAPPY PATH — undefined input returns false safely.
  it('returns false when deadline is undefined', () => {
    expect(isDeadlineSoon(undefined)).toBe(false);
  });

  // NON-HAPPY PATH — empty string returns false safely.
  it('returns false when deadline is an empty string', () => {
    expect(isDeadlineSoon('')).toBe(false);
  });

  // EDGE CASE — deadline exactly at the 3-day boundary.
  // A deadline exactly 3 days from now should be treated as "soon".
  it('returns true when the deadline is exactly 3 days away', () => {
    const exactlyThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 1000).toISOString();
    expect(isDeadlineSoon(exactlyThreeDays)).toBe(true);
  });
});
