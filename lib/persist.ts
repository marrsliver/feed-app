import { queueWrite, clearWrite } from './pendingWrites'
import { notifyPendingWritesChanged } from '../hooks/usePendingWrites'

export function persist(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): void {
  const writeId = queueWrite(url, method, body)
  notifyPendingWritesChanged()
  fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
    .then((r) => { if (r.ok) { clearWrite(writeId); notifyPendingWritesChanged() } })
    .catch(() => { /* stays in queue until replayed */ })
}
