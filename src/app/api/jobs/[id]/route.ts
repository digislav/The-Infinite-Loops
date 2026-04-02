import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'
import { getJobById, updateJob, deleteJob } from '../../../../lib/services/jobServices'

const supabase = createClient()

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getJobById(params.id, user.id)
  if (error) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { data, error } = await updateJob(params.id, user.id, body)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Invalid update' }, { status: 400 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await deleteJob(params.id, user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

//Will update with GET /api/jobs/:id/activites