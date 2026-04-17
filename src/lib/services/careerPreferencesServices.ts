import { createClient } from '../supabase/server';

export type CareerPreferences = {
  user_id: string;
  target_roles: string[];
  location_preferences: string[];
  work_mode: 'Remote' | 'On-site' | 'Hybrid' | 'Any';
  min_salary: number;
  currency: string;
};

export async function getCareerPreferences(userId: string) {
  const supabase = await createClient();
  return await supabase.from('career_preferences').select('*').eq('user_id', userId).maybeSingle();
}

export async function updateCareerPreferences(userId: string, data: Partial<CareerPreferences>) {
  const supabase = await createClient();
  // Upsert handles both Create and Update in one go
  return await supabase
    .from('career_preferences')
    .upsert({ ...data, user_id: userId, updated_at: new Date().toISOString() })
    .select()
    .single();
}
