import { NextResponse } from 'next/server'
import { saveProfile, getProfile } from '@/lib/services/profileService'

export async function GET() {
  const { data, error } = await getProfile()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || null })
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { data, error } = await saveProfile(body)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
