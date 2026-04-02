import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/client'
import { getJobs, createJob } from '../../../lib/services/jobServices'
const supabase = createClient()

export async function GET(req: Request) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filters = {
    status: searchParams.get('status') || undefined,
    deadline: searchParams.get('deadline') || undefined
  }

  const { data, error } = await getJobs(user.id, filters)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { data, error } = await createJob({ ...body, user_id: user.id })
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}