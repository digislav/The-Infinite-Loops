import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateExperience, deleteExperience } from '@/lib/services/experienceServices';
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // AWAIT the params here
  const { id } = await params;

  try {
    const body = await request.json();
    const validationError = validateExperienceDates(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const { data, error } = await updateExperience(id, user.id, body);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (_err) {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // AWAIT the params here
  const { id } = await params;

  const { error } = await deleteExperience(id, user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
