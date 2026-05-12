import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addDocumentVersion } from '@/lib/services/documentServices';

// GET /api/documents/:id/versions — S3-003: Document Version History.
// Returns all versions for a document owned by the authenticated user.
// Ownership enforced by joining through the documents table per S1-003 §4.3.
// Never trusts user_id from the client — always sourced from session.
//
// POST /api/documents/:id/versions — S3-003: Restore a version.
// Creates a new version with the content of a previous version, making it
// the latest. Does NOT delete old versions — history is append-only.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();

  // Auth check first — per S1-003 §2.1.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify the document belongs to the authenticated user before returning
  // any version data — per S1-003 §4.3 (child ownership via parent join).
  // Non-owners get 404, never 403 — per S1-003 §5.5.
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch all versions ordered newest first so the UI shows latest at top.
  const { data: versions, error: versionsError } = await supabase
    .from('document_versions')
    .select('id, version_number, created_at, content')
    .eq('document_id', id)
    .order('version_number', { ascending: false });

  if (versionsError) {
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: versions ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();

  // Auth check first — per S1-003 §2.1.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before allowing any write — per S1-003 §4.3.
  // Non-owners get 404, never 403 — per S1-003 §5.5.
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, content')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const { content } = body ?? {};

  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  // Step 1: Add a new version entry with the restored content.
  // History is append-only — we never delete previous versions.
  const { data: newVersion, error: versionError } = await addDocumentVersion(id, content);

  if (versionError) {
    return NextResponse.json({ error: 'Failed to save version' }, { status: 500 });
  }

  // Step 2: Update the document's main content column so it reflects the
  // restored version immediately when the document is loaded.
  const { error: updateError } = await supabase
    .from('documents')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: newVersion });
}
