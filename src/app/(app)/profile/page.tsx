import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { EMPTY_PROFILE } from '@/types/profile.types';
import type { Profile } from '@/types/profile.types';
import { getProfile } from '@/lib/services/profileService';

// ProfilePage is a Next.js Server Component — runs entirely on the server.
// The old version had a raw supabase.from('profiles').select('*') query
// directly in this file which was the security vulnerability the professor flagged.
// It has been replaced with a call to profileService.ts which:
// 1. Only selects the specific columns needed (no select('*'))
// 2. Enforces ownership in the query via .eq('user_id', userId)
// Per S1-003 §7 — direct DB access in frontend components is a prohibited pattern.

export default async function ProfilePage() {
  // Create the server-side Supabase client to read the session.
  // Because this is a Server Component, this runs on the server —
  // the user cannot manipulate the session from the browser.
  const supabase = await createClient();

  // Get the verified session user. user.id is the only trusted identity —
  // we never use an ID from a URL param or request body per S1-003 §5.4.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Start with an empty profile as the default.
  // If the fetch fails or the user has no profile yet,
  // the form renders with empty fields rather than crashing.
  let profile: Profile = EMPTY_PROFILE;

  if (user) {
    // Fetch through the service layer using the session-verified user.id.
    // The service enforces ownership in the query — this user can only
    // ever get their own profile row per S1-003 §5.2.
    const { data } = await getProfile(user.id);

    if (data) {
      // Map the DB record to the Profile type.
      // Use ?? '' to safely handle any null values from the database.
      profile = {
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        location: data.location ?? '',
        linkedin_url: data.linkedin_url ?? '',
        github_url: data.github_url ?? '',
        portfolio_url: data.portfolio_url ?? '',
        headline: data.headline ?? '',
        summary: data.summary ?? '',
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-foreground text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Keep your professional profile up to date. This information is used to generate your
          resumes and cover letters.
        </p>
      </div>
      {/* Pass the fetched profile (or empty default) into the form component */}
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
