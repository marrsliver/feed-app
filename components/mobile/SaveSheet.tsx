'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import type { Post } from '@/lib/types'
import { BottomSheet } from './BottomSheet'

interface Props {
  post: Post | null
  spaces: { id: string; name: string }[]
  savedIn: { id: string; name: string }[]
  recentSpaceId: string | null
  onClose: () => void
  onSave: (post: Post, spaceId: string) => void
  onCreateAndSave: (post: Post, name: string) => void
}

export function SaveSheet({ post, spaces, savedIn, recentSpaceId, onClose, onSave, onCreateAndSave }: Props) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  if (!post) return null

  const savedIds = new Set(savedIn.map((s) => s.id))
  const ordered = [...spaces].sort((a, b) => {
    if (a.id === recentSpaceId) return -1
    if (b.id === recentSpaceId) return 1
    return a.name.localeCompare(b.name)
  })

  function submitNew(e: React.FormEvent) {
    e.preventDefault()
    if (!post || !name.trim()) return
    onCreateAndSave(post, name.trim())
    setName('')
    setCreating(false)
  }

  return (
    <BottomSheet open onClose={onClose} title="Save to a space">
      <div className="px-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <p className="px-2 pb-3 text-[14px] text-black/45 line-clamp-2">{post.title}</p>

        {creating ? (
          <form onSubmit={submitNew} className="flex items-center gap-2 px-2 pb-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Space name"
              className="h-12 flex-1 min-w-0 rounded-xl bg-black/5 px-4 text-[16px] outline-none focus:ring-2 focus:ring-black/20"
            />
            <button type="submit" disabled={!name.trim()} className="h-12 px-5 rounded-xl bg-black text-white text-[15px] font-semibold disabled:opacity-30">
              Save
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3 h-14 text-left text-[16px] font-medium active:bg-black/5"
          >
            <span className="h-9 w-9 flex items-center justify-center rounded-lg border border-dashed border-black/25">
              <Plus size={18} />
            </span>
            New space
          </button>
        )}

        {ordered.map((s) => {
          const isSaved = savedIds.has(s.id)
          return (
            <button
              key={s.id}
              onClick={() => onSave(post, s.id)}
              className="w-full flex items-center gap-3 rounded-xl px-3 h-14 text-left active:bg-black/5"
            >
              <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-black text-white font-display text-[15px] font-semibold">
                {s.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0 truncate text-[16px] font-medium">{s.name}</span>
              {s.id === recentSpaceId && !isSaved && <span className="text-[12px] text-black/35">Recent</span>}
              {isSaved && <Check size={18} className="shrink-0" />}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
