import { supabase } from '@/lib/supabase/client'

export type Profile = {
  id?: string
  user_id?: string

  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  location?: string

  professional_links?: string[]

  headline?: string
  summary?: string

  created_at?: string
}

export async function saveProfile(profile: Profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { 
      onConflict: 'user_id'
    })
    .select() 

  return { data, error }
}

export async function getProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1) 
    .single()

  return { data, error }
}
