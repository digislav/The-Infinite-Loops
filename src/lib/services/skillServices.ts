import { createClient } from '../supabase/server';
import { Skill } from '@/types/skill.types';

export async function getSkills(userId: string) {
  const supabase = await createClient();
  return await supabase
    .from('skills')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true });
}

export async function createSkill(userId: string, data: Partial<Skill>) {
  const supabase = await createClient();
  return await supabase
    .from('skills')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();
}

export async function updateSkill(id: string, userId: string, updates: Partial<Skill>) {
  const supabase = await createClient();
  return await supabase
    .from('skills')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
}

export async function deleteSkill(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase.from('skills').delete().eq('id', id).eq('user_id', userId);
}
