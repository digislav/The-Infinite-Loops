import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExperience, createExperience } from '@/lib/services/experienceServices';
import { isEndDateBeforeStartDate } from '@/lib/utils/dateValidation';

function validateExperienceDates(body: {
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
}) {
  if (!body.is_current && isEndDateBeforeStartDate(body.start_date ?? '', body.end_date ?? '')) {
    return 'End date cannot be before the start date.';
  }
  return null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getExperience(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const validationError = validateExperienceDates(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { data, error } = await createExperience(user.id, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
