import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDocument, getDocumentsByJob } from '@/lib/services/documentServices';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const jobId = request.nextUrl.searchParams.get('jobId');
    const { data, error } = jobId
      ? await getDocumentsByJob(user.id, jobId)
      : await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Validate required fields.
    const { job_id, type, name, content, status, tags } = body;
    if (!name || !type || !content || !job_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Strip user_id from body — always use session identity per S1-003 §5.4.
    const { data, error } = await createDocument(user.id, {
      job_id,
      type,
      name,
      content,
      status: status || 'draft',
      tags: tags || [],
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
  }
}
