import { NextRequest, NextResponse } from 'next/server'; // Use NextRequest
import { createClient } from '@/lib/supabase/server';
import { getInterviewsByJob, addInterview } from '@/lib/services/jobServices';

// GET all interviews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Change to Promise
) {
  try {
    const { id } = await params; // MUST await params now
    const { data, error } = await getInterviewsByJob(id);
    
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
  { params }: { params: Promise<{ id: string }> } // Change to Promise
) {
  try {
    const { id } = await params; // MUST await params now
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
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