export interface Profile {
  id?: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  headline: string;
  summary: string;
}

export const EMPTY_PROFILE: Profile = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  location: '',
  linkedin_url: '',
  github_url: '',
  portfolio_url: '',
  headline: '',
  summary: '',
};

export const REQUIRED_PROFILE_FIELDS: (keyof Profile)[] = [
  'first_name',
  'last_name',
  'email',
  'headline',
  'summary',
];

export function calculateCompletion(profile: Profile): number {
  const total = REQUIRED_PROFILE_FIELDS.length;
  const filled = REQUIRED_PROFILE_FIELDS.filter(
    (field) => profile[field] && String(profile[field]).trim() !== '',
  ).length;
  return Math.round((filled / total) * 100);
}
