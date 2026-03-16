/**
 * Pending writes queue — survives page reloads via localStorage.
 *
 * When a DB mutation fails, callers add it to this queue.
 * On app start (and on demand), replayPendingWrites() replays them in order.
 * PATCH writes to the same URL are deduplicated: only the latest body is kept.
 * DELETE cancels any earlier queued writes to the same URL.
 */

const LS_KEY = 'pending_writes_v2'

export interface PendingWrite {
  id: string
  url: string
  method: 'POST' | 'PATCH' | 'DELETE'
  body: string | null
  queuedAt: number
}

function load(): PendingWrite[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingWrite[]
  } catch { return [] }
}

function save(queue: PendingWrite[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(queue)) } catch { /* ignore */ }
}

export function getPendingWrites(): PendingWrite[] {
  return load()
}

export function getPendingCount(): number {
  return load().length
}

export function queueWrite(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): string {
  const queue = load()
  const id = crypto.randomUUID()
  const write: PendingWrite = {
    id,
    url,
    method,
    body: body !== undefined ? JSON.stringify(body) : null,
    queuedAt: Date.now(),
  }

  if (method === 'DELETE') {
    // A DELETE cancels all earlier writes to this URL
    const filtered = queue.filter((w) => w.url !== url)
    save([...filtered, write])
  } else if (method === 'PATCH') {
    // Latest PATCH to the same URL replaces earlier ones
    const filtered = queue.filter((w) => !(w.url === url && w.method === 'PATCH'))
    save([...filtered, write])
  } else {
    save([...queue, write])
  }

  return id
}

export function clearWrite(id: string) {
  const queue = load().filter((w) => w.id !== id)
  save(queue)
}

export async function replayPendingWrites(): Promise<{ succeeded: number; failed: number }> {
  const queue = load()
  if (queue.length === 0) return { succeeded: 0, failed: 0 }

  let succeeded = 0
  let failed = 0

  // Replay in order — important for create-then-update sequences
  for (const write of queue) {
    try {
      const res = await fetch(write.url, {
        method: write.method,
        headers: write.body ? { 'Content-Type': 'application/json' } : {},
        body: write.body ?? undefined,
      })
      if (res.ok) {
        clearWrite(write.id)
        succeeded++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { succeeded, failed }
}
