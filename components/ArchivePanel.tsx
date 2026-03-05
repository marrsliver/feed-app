'use client'

import { X, RotateCcw } from 'lucide-react'
import type { DeletedRecord } from '@/hooks/useDeletedPosts'

interface Props {
  records: DeletedRecord[]
  onRestore: (postId: string) => void
  onClose: () => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const FEED_LABELS: Record<string, string> = {
  research: 'Research',
  music: 'Music',
  misc: 'Misc',
}

export function ArchivePanel({ records, onRestore, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-80 z-50 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
          <h2 className="text-sm font-semibold text-black">Deleted cards</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {records.length === 0 ? (
            <p className="text-center py-16 text-black/25 text-sm">No deleted cards yet.</p>
          ) : (
            <div className="divide-y divide-black/5">
              {records.map((r) => (
                <div key={r.post.id} className="flex items-start gap-3 px-4 py-3 group">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-black leading-snug line-clamp-2">
                      {r.post.title}
                    </p>
                    <p className="text-[9px] text-black/30 tracking-widest uppercase">
                      {r.post.sourceName} · {FEED_LABELS[r.feedId] ?? r.feedId} · deleted {formatDate(r.deletedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRestore(r.post.id)}
                    className="shrink-0 mt-0.5 p-1.5 text-black/25 hover:text-black hover:bg-black/5 transition-colors"
                    aria-label="Restore card"
                    title="Restore"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
