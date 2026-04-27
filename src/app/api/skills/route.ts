import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Skill } from '@/types/skill.types';
import { getSkills, createSkill } from '@/lib/services/skillServices';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSkills(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as Partial<Skill>;

  if (!body.skill_name?.trim()) {
    return NextResponse.json({ error: 'Skill name is required.' }, { status: 400 });
  }

  // Check for duplicate skill name (case-insensitive) for this user.
  const { data: existing } = await supabase
    .from('skills')
    .select('id')
    .eq('user_id', user.id)
    .ilike('skill_name', body.skill_name.trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a skill with that name.' },
      { status: 409 },
    );
  }

  const { data, error } = await createSkill(user.id, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
