import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Ownership check — only return file_path if the user owns this document.
  const { data: doc, error } = await supabase
    .from('documents')
    .select('file_path, original_filename')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!doc.file_path) return NextResponse.json({ error: 'No file attached' }, { status: 404 });

  const { data: signed, error: signError } = await supabase.storage
    .from('user_documents')
    .createSignedUrl(doc.file_path, 300); // 5-minute expiry

  if (signError || !signed) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, filename: doc.original_filename });
}
