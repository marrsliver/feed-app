import { NextResponse } from 'next/server'
import { sources } from '@/lib/sources.config'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json({ sources })
}
