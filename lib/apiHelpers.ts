import { NextResponse } from 'next/server'

/** Parse request JSON safely. Returns null + 400 response on failure. */
export async function parseBody<T = Record<string, unknown>>(
  req: Request
): Promise<{ body: T; error: null } | { body: null; error: NextResponse }> {
  try {
    const body = await req.json()
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return { body: null, error: NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 }) }
    }
    return { body: body as T, error: null }
  } catch {
    return { body: null, error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }
}

/** Return a 400 if any required field is missing/empty. */
export function requireFields(
  body: Record<string, unknown>,
  fields: string[]
): NextResponse | null {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '')
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
  }
  return null
}
