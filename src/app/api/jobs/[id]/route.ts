import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'
import { getJobById, updateJob, deleteJob } from '../../../../lib/services/jobServices'

const supabase = createClient()

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // Step 1: Await the ID
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getJobById(id, user.id); // Step 2: Use the awaited ID
  if (error) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  
  return NextResponse.json({ data })
}

export async function PUT(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { data, error } = await updateJob(id, user.id, body)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Invalid update' }, { status: 400 })
  }
}

export async function DELETE(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await deleteJob(id, user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return new NextResponse(null, { status: 204 })
}
