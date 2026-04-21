import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDocument } from '@/lib/services/documentServices';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { data, error } = await createDocument(user.id, body);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (_err) {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
  }
}
