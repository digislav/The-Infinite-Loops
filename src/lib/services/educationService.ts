import { createClient } from '../supabase/server';

// Service layer for education data access — S2-017.
// All database queries for education records go through here —
// never query the education table directly from a component or route handler.
// Per S1-001 §4.4 — domain service functions live in lib/services/.
// Per S1-003 §5.2 — ownership enforced in every query via .eq('user_id', userId).

export type Education = {
  id?: string;
  user_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date?: string;
  end_date?: string; // null if is_current is true
  is_current: boolean;
  honors_gpa?: string;
  description?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
};

// 1. GET ALL — fetches all education records for a user sorted by order_index.
// Ownership enforced via .eq('user_id', userId) per S1-003 §5.2.
export async function getEducation(userId: string) {
  const supabase = await createClient();
  return await supabase
    .from('education')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true });
}

// 2. CREATE — inserts a new education record.
// user_id always comes from the session (passed in by the route handler) —
// never from the request body per S1-003 §5.4.
export async function createEducation(userId: string, data: Partial<Education>) {
  const supabase = await createClient();
  return await supabase
    .from('education')
    .insert({ ...data, user_id: userId })
    .select()
    .single();
}

// 3. UPDATE — updates an existing education record.
// .eq('user_id', userId) ensures a user can only update their own records.
// Per S1-003 §5.2 — ownership enforced in the query itself.
export async function updateEducation(id: string, userId: string, updates: Partial<Education>) {
  const supabase = await createClient();
  return await supabase
    .from('education')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
}

// 4. DELETE — deletes an education record.
// .eq('user_id', userId) prevents a user from deleting another user's records.
// Per S1-003 §5.2 — ownership enforced in the query itself.
export async function deleteEducation(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase.from('education').delete().eq('id', id).eq('user_id', userId);
}
