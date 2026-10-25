'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Post, Space } from '@/lib/types'
import { BottomSheet } from './BottomSheet'

interface Props {
  open: boolean
  spaces: Space[]
  onClose: () => void
  onOpenPost: (post: Post) => void
}

function savedPosts(space: Space): Post[] {
  return space.items
    .filter((i) => i.type === 'post' && i.postData)
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((i) => i.postData as Post)
}

export function SavedSheet({ open, spaces, onClose, onOpenPost }: Props) {
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const active = spaces.find((s) => s.id === spaceId)
  const sorted = [...spaces].sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))

  return (
    <BottomSheet
      open={open}
      onClose={() => { setSpaceId(null); onClose() }}
      size="full"
      title={
        active ? (
          <button onClick={() => setSpaceId(null)} className="flex items-center gap-1 -ml-1.5 max-w-full">
            <ChevronLeft size={22} className="shrink-0" />
            <span className="truncate">{active.name}</span>
          </button>
        ) : (
          'Saved'
        )
      }
    >
      {active ? (
        <ul className="px-3 pb-10">
          {savedPosts(active).length === 0 && (
            <li className="px-2 py-10 text-center text-[15px] text-black/40">Nothing saved here yet.</li>
          )}
          {savedPosts(active).map((p) => (
            <li key={p.id}>
              <button onClick={() => onOpenPost(p)} className="w-full flex gap-3 rounded-xl p-2 text-left active:bg-black/5">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover bg-black/5" />
                ) : (
                  <span className="h-16 w-16 shrink-0 rounded-lg" style={{ backgroundColor: p.sourceColor }} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] truncate" style={{ color: p.sourceColor }}>
                    {p.sourceName}
                  </span>
                  <span className="mt-0.5 block font-display text-[16px] leading-snug font-semibold line-clamp-2">{p.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="px-3 pb-10">
          {sorted.length === 0 && (
            <li className="px-2 py-10 text-center text-[15px] text-black/40">
              Swipe right on a story to start your first space.
            </li>
          )}
          {sorted.map((s) => {
            const posts = savedPosts(s)
            return (
              <li key={s.id}>
                <button onClick={() => setSpaceId(s.id)} className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5 text-left active:bg-black/5">
                  <span className="flex -space-x-3 shrink-0 w-[68px]">
                    {posts.slice(0, 3).map((p) =>
                      p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.id} src={p.image} alt="" loading="lazy" className="h-11 w-11 rounded-lg object-cover ring-2 ring-white bg-black/5" />
                      ) : (
                        <span key={p.id} className="h-11 w-11 rounded-lg ring-2 ring-white" style={{ backgroundColor: p.sourceColor }} />
                      ),
                    )}
                    {posts.length === 0 && <span className="h-11 w-11 rounded-lg bg-black/5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold truncate">{s.name}</span>
                    <span className="block text-[13px] text-black/40">
                      {posts.length} {posts.length === 1 ? 'story' : 'stories'}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-black/25" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </BottomSheet>
  )
}
