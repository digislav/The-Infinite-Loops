import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { EMPTY_PROFILE } from '@/types/profile.types';
import type { Profile } from '@/types/profile.types';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile = EMPTY_PROFILE;

  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();

    if (data) {
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
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
