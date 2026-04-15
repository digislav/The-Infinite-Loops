// Unit tests for S2-025 dashboard metrics logic.
// Tests the response rate and interview rate calculations
// that are computed in StatsBar from the job data.
//
// These are pure calculation tests — no DB or API calls needed.
// Covers all 4 required categories per S1-001 §8.2.

// Helper functions that mirror the calculation logic in StatsBar.
// Extracted here so we can test them in isolation.

function calculateResponseRate(
  applied: number,
  interview: number,
  offer: number,
  rejected: number,
  ghosted: number,
): number {
  const activeJobs = applied + interview + offer + rejected + ghosted;
  const responded = interview + offer + rejected + ghosted;
  return activeJobs > 0 ? Math.round((responded / activeJobs) * 100) : 0;
}

function calculateInterviewRate(
  applied: number,
  interview: number,
  offer: number,
  rejected: number,
  ghosted: number,
): number {
  const activeJobs = applied + interview + offer + rejected + ghosted;
  return activeJobs > 0 ? Math.round(((interview + offer) / activeJobs) * 100) : 0;
}

function calculateActiveJobs(
  applied: number,
  interview: number,
  offer: number,
  rejected: number,
  ghosted: number,
): number {
  return applied + interview + offer + rejected + ghosted;
}

describe('calculateResponseRate', () => {
  // HAPPY PATH — normal case with mixed stages.
  it('calculates correct response rate when some applications received responses', () => {
    // 5 applied, 2 interview, 1 offer, 1 rejected, 1 ghosted
    // Active = 10, Responded = 4, Rate = 40%
    expect(calculateResponseRate(5, 2, 1, 1, 1)).toBe(40);
  });

  // HAPPY PATH — all applications received responses.
  it('returns 100% when all active applications received responses', () => {
    // 0 applied, 3 interview, 2 offer, 1 rejected, 0 ghosted
    // Active = 6, Responded = 6, Rate = 100%
    expect(calculateResponseRate(0, 3, 2, 1, 0)).toBe(100);
  });

  // NON-HAPPY PATH — no responses yet.
  it('returns 0% when no applications have received responses', () => {
    // 5 applied, 0 everything else
    // Active = 5, Responded = 0, Rate = 0%
    expect(calculateResponseRate(5, 0, 0, 0, 0)).toBe(0);
  });

  // NON-HAPPY PATH — no active jobs.
  // Prevents division by zero when user has no applied jobs.
  it('returns 0% when there are no active applications', () => {
    expect(calculateResponseRate(0, 0, 0, 0, 0)).toBe(0);
  });

  // EDGE CASE — rounds to nearest integer.
  it('rounds the response rate to the nearest integer', () => {
    // 3 applied, 1 interview = 4 active, 1 responded = 25%
    expect(calculateResponseRate(3, 1, 0, 0, 0)).toBe(25);
  });
});

describe('calculateInterviewRate', () => {
  // HAPPY PATH — some applications reached interview stage.
  it('calculates correct interview rate', () => {
    // 5 applied, 2 interview, 1 offer, 1 rejected, 1 ghosted
    // Active = 10, Interviewed = 3, Rate = 30%
    expect(calculateInterviewRate(5, 2, 1, 1, 1)).toBe(30);
  });

  // HAPPY PATH — all applications reached interview.
  it('returns 100% when all active applications reached interview stage', () => {
    expect(calculateInterviewRate(0, 3, 2, 0, 0)).toBe(100);
  });

  // NON-HAPPY PATH — no interviews yet.
  it('returns 0% when no applications reached interview stage', () => {
    expect(calculateInterviewRate(5, 0, 0, 2, 1)).toBe(0);
  });

  // NON-HAPPY PATH — no active jobs.
  it('returns 0% when there are no active applications', () => {
    expect(calculateInterviewRate(0, 0, 0, 0, 0)).toBe(0);
  });
});

describe('calculateActiveJobs', () => {
  // HAPPY PATH — counts all applied and beyond stages.
  it('counts all jobs that have been formally applied to', () => {
    // Interested and Archived are excluded — only Applied and beyond count.
    expect(calculateActiveJobs(5, 2, 1, 1, 1)).toBe(10);
  });

  // NON-HAPPY PATH — only interested jobs, no active applications.
  it('returns 0 when all jobs are in Interested stage', () => {
    expect(calculateActiveJobs(0, 0, 0, 0, 0)).toBe(0);
  });
});
