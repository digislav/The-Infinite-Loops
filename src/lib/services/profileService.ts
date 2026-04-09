import { createClient } from '@/lib/supabase/server';

// Service layer for profile data access.
// All database queries for profiles go through here —
// never query the profiles table directly from a page or route handler.
// Per S1-001 §4.4 — domain service functions live in lib/services/.

export async function getProfile(userId: string) {
  const supabase = await createClient();

  return (
    supabase
      .from('profiles')
      // Only select the columns the UI actually needs.
      // Never use select('*') — it exposes every column including
      // any sensitive fields added to the table in the future.
      // This was the security vulnerability the professor flagged.
      .select(
        'first_name, last_name, email, phone, location, linkedin_url, github_url, portfolio_url, headline, summary',
      )
      // Ownership enforced here in the query itself.
      // A user can only ever get their own profile row —
      // even if a different userId is passed, the DB returns null.
      // Per S1-003 §5.2.
      .eq('user_id', userId)
      .single()
  );
}
