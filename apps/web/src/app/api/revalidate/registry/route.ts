import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { slug?: string }
    const slug = body.slug?.trim()

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    revalidatePath(`/registry/${slug}`)
    revalidatePath(`/registries/${slug}`)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}