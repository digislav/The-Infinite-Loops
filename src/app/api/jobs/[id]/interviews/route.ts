import { NextRequest, NextResponse } from 'next/server'; // Use NextRequest
import { createClient } from '@/lib/supabase/server';
import { getInterviewsByJob, addInterview } from '@/lib/services/jobServices';
import { isDateTimeLocalBeforeNow } from '@/lib/utils/dateValidation';

//GET all interviews
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify session — per S1-003 §2.3 auth is the first action.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Pass userId so ownership is enforced in the service layer.
    const { data, error } = await getInterviewsByJob(id, user.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a new interview
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // Change to Promise
) {
  try {
    const { id } = await params; // MUST await params now
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.interview_date) {
      return NextResponse.json({ error: 'Interview date is required' }, { status: 400 });
    }

    const interviewDate = new Date(body.interview_date);
    if (Number.isNaN(interviewDate.getTime())) {
      return NextResponse.json({ error: 'Invalid interview date' }, { status: 400 });
    }

    if (isDateTimeLocalBeforeNow(body.interview_date)) {
      return NextResponse.json(
        { error: 'Interview date and time cannot be in the past.' },
        { status: 400 },
      );
    }

    const { data, error } = await addInterview(user.id, id, body);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
