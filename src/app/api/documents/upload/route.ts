import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDocumentWithVersion } from '@/lib/services/documentServices';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'resume' | 'cover_letter' | null;
    const jobId = formData.get('job_id') as string | null;

    if (!file || !type) {
      return NextResponse.json({ error: 'Missing file or type' }, { status: 400 });
    }

    // Constraints Validation
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 });
    }

    const ALLOWED_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and Word docs are allowed.' },
        { status: 400 },
      );
    }

    // Generate a secure unique path for the file
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `${user.id}/${uniqueFilename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('user_documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage.' }, { status: 500 });
    }

    // Create database record using S3-003 versioning logic
    const contentPlaceholder = `[Uploaded File: ${file.name}]`;
    const docName = file.name.replace(/\.[^/.]+$/, ''); // Strip extension for the DB name

    const result = await createDocumentWithVersion(user.id, {
      name: docName,
      type: type,
      job_id: jobId || undefined,
      content: contentPlaceholder,
      file_path: filePath,
      file_size: file.size,
      original_filename: file.name,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    console.error('Upload Error:', err);
    const message = err instanceof Error ? err.message : 'Invalid Request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
