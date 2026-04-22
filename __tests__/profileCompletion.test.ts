// Unit tests for calculateCompletion in profile.types.ts
// Tests the pure function that computes profile completion percentage
// from the 5 required fields: first_name, last_name, email, headline, summary.
//
// Pure function — no DB access, no mocking needed.
// Covers all 4 required categories per S1-001 §8.2.

import { calculateCompletion } from '@/types/profile.types';
import { EMPTY_PROFILE } from '@/types/profile.types';
import type { Profile } from '@/types/profile.types';

// ---------------------------------------------------------------------------
// Base fixture — a fully completed profile used as the happy-path baseline.
// ---------------------------------------------------------------------------
const COMPLETE_PROFILE: Profile = {
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane@example.com',
  phone: '555-1234',
  location: 'New York, NY',
  linkedin_url: 'linkedin.com/in/jane',
  github_url: 'github.com/jane',
  portfolio_url: 'janesmith.com',
  headline: 'Full Stack Engineer',
  summary: 'Experienced developer with a focus on React.',
};

describe('calculateCompletion', () => {
  // HAPPY PATH — all required fields filled returns 100%.
  //test for profile completion logic
  it('returns 100 when all required fields are filled', () => {
    expect(calculateCompletion(COMPLETE_PROFILE)).toBe(100);
  });

  // HAPPY PATH — partial completion returns the correct percentage.
  // Required fields: first_name, last_name, email, headline, summary (5 total).
  // Filling 4 of 5 should return 80%.
  it('returns 80 when 4 of 5 required fields are filled', () => {
    const profile: Profile = { ...COMPLETE_PROFILE, summary: '' };
    expect(calculateCompletion(profile)).toBe(80);
  });

  it('returns 60 when 3 of 5 required fields are filled', () => {
    const profile: Profile = { ...COMPLETE_PROFILE, summary: '', headline: '' };
    expect(calculateCompletion(profile)).toBe(60);
  });

  // VALIDATION FAILURE — empty profile returns 0%.
  // Per S1-002 §11.1 — completion indicator must reflect 0 for a blank profile.
  it('returns 0 when no required fields are filled', () => {
    expect(calculateCompletion(EMPTY_PROFILE)).toBe(0);
  });

  // VALIDATION FAILURE — whitespace-only values do not count as filled.
  // A field with only spaces should be treated as empty.
  it('returns 0 when required fields contain only whitespace', () => {
    const profile: Profile = {
      ...EMPTY_PROFILE,
      first_name: '   ',
      last_name: '   ',
      email: '   ',
      headline: '   ',
      summary: '   ',
    };
    expect(calculateCompletion(profile)).toBe(0);
  });

  // VALIDATION FAILURE — optional fields do not affect the score.
  // Filling in phone, location, linkedin_url etc. should not change the %.
  it('does not count optional fields toward completion', () => {
    const profileWithOnlyOptionals: Profile = {
      ...EMPTY_PROFILE,
      phone: '555-0000',
      location: 'Remote',
      linkedin_url: 'linkedin.com/in/jane',
      github_url: 'github.com/jane',
      portfolio_url: 'janesmith.com',
    };
    expect(calculateCompletion(profileWithOnlyOptionals)).toBe(0);
  });

  // ERROR / EDGE CASE — result is always a whole number (Math.round).
  // With 5 required fields, all percentages are multiples of 20 so
  // rounding is never ambiguous — but we verify it returns a number.
  it('always returns a number', () => {
    const result = calculateCompletion(COMPLETE_PROFILE);
    expect(typeof result).toBe('number');
  });

  // EDGE CASE — filling exactly one required field returns 20%.
  it('returns 20 when only one required field is filled', () => {
    const profile: Profile = { ...EMPTY_PROFILE, first_name: 'Jane' };
    expect(calculateCompletion(profile)).toBe(20);
  });

  // EDGE CASE — each required field independently contributes to the score.
  it('counts last_name as a required field', () => {
    const profile: Profile = { ...EMPTY_PROFILE, last_name: 'Smith' };
    expect(calculateCompletion(profile)).toBe(20);
  });

  it('counts email as a required field', () => {
    const profile: Profile = { ...EMPTY_PROFILE, email: 'jane@example.com' };
    expect(calculateCompletion(profile)).toBe(20);
  });

  it('counts headline as a required field', () => {
    const profile: Profile = { ...EMPTY_PROFILE, headline: 'Engineer' };
    expect(calculateCompletion(profile)).toBe(20);
  });

  it('counts summary as a required field', () => {
    const profile: Profile = { ...EMPTY_PROFILE, summary: 'Experienced dev.' };
    expect(calculateCompletion(profile)).toBe(20);
  });
});
