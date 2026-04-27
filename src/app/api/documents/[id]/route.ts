import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateDocument,
  deleteDocument,
  toggleDocumentArchive,
} from '@/lib/services/documentServices';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // 1. Handle Archive/Restore (S3-008)
    if (typeof body.archive === 'boolean') {
      const { data, error } = await toggleDocumentArchive(id, user.id, body.archive);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data);
    }

    // 2. Handle General Updates (Sprint 1/2 logic)
    // Strip protected fields to prevent mass assignment vulnerabilities
    const { id: _id, user_id: _userId, created_at: _createdAt, ...safeUpdates } = body;

    // If there are no updates left after stripping, throw error
    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    const { data, error } = await updateDocument(id, user.id, safeUpdates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid Request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { error } = await deleteDocument(id, user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
