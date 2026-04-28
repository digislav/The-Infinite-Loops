import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDocument, getDocumentsByJob } from '@/lib/services/documentServices';
import { createDocumentWithVersion } from '@/lib/services/documentServices';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const jobId = request.nextUrl.searchParams.get('jobId');
    const showArchived = request.nextUrl.searchParams.get('showArchived') === 'true';

    const { data, error } = jobId
      ? await getDocumentsByJob(user.id, jobId)
      : await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', showArchived)
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
    const { job_id, type, name, content, status, tags } = body;

    // S3-003: job_id is now optional, but name, type, and content are required
    if (!name || !type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // UPGRADE: Use the new Versioning Service you wrote
    // This handles BOTH the 'documents' table and 'document_versions' table
    const result = await createDocumentWithVersion(user.id, {
      job_id: job_id || null, // Allow null for general documents
      type,
      name,
      content,
      // Note: tags/status can be added to createDocumentWithVersion if needed
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid Request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
