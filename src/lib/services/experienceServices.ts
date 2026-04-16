import { createClient } from '../supabase/server';

export type Experience = {
  id?: string;
  user_id: string;
  company_name: string;
  role_title: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
  order_index: number;
  created_at?: string;
};

// 1. GET ALL (Sorted by the user's preferred order)
export async function getExperiences(userId: string) {
  const supabase = await createClient();
  return await supabase
    .from('experience')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true });
}

// 2. CREATE
export async function createExperience(userId: string, data: Partial<Experience>) {
  const supabase = await createClient();
  return await supabase
    .from('experience')
    .insert({ ...data, user_id: userId })
    .select()
    .single();
}

// 3. UPDATE
export async function updateExperience(id: string, userId: string, updates: Partial<Experience>) {
  const supabase = await createClient();
  return await supabase
    .from('experience')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
}

// 4. DELETE
export async function deleteExperience(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase.from('experience').delete().eq('id', id).eq('user_id', userId);
}

// 5. REORDER
// Takes an array of IDs in the new order and updates their indexes
export async function updateExperienceOrder(userId: string, experienceIds: string[]) {
  const supabase = await createClient();

  const updates = experienceIds.map((id, index) =>
    supabase.from('experience').update({ order_index: index }).eq('id', id).eq('user_id', userId),
  );

  return await Promise.all(updates);
}

// Helper function that handles the is_current logic
export async function markAsCurrent(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase
    .from('experience')
    .update({
      is_current: true,
      end_date: null,
    })
    .eq('id', id)
    .eq('user_id', userId);
}
