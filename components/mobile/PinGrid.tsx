'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark } from 'lucide-react'
import type { Post } from '@/lib/types'

interface Props {
  posts: Post[]
  isRead: (id: string) => boolean
  savedIds: Set<string>
  onOpen: (post: Post) => void
  onSave: (post: Post) => void
  /** Called when the user nears the end of what's rendered */
  onEndReached?: () => void
}

// Rough relative heights so the two columns stay balanced without measuring
function estimateHeight(p: Post): number {
  const titleLines = Math.min(3, Math.ceil(p.title.length / 26))
  return (p.image ? 1.25 : 1.1) + titleLines * 0.18
}

// Two-column masonry. Posts are dealt to whichever column is shorter, so
// reading order stays roughly left-to-right, top-to-bottom like Pinterest.
export function PinGrid({ posts, isRead, savedIds, onOpen, onSave, onEndReached }: Props) {
  const columns = useMemo(() => {
    const cols: Post[][] = [[], []]
    const heights = [0, 0]
    for (const p of posts) {
      const i = heights[0] <= heights[1] ? 0 : 1
      cols[i].push(p)
      heights[i] += estimateHeight(p)
    }
    return cols
  }, [posts])

  const sentinel = useRef<HTMLDivElement>(null)
  const onEndRef = useRef(onEndReached)
  onEndRef.current = onEndReached
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onEndRef.current?.() },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className="flex gap-2 px-2">
        {columns.map((col, ci) => (
          <div key={ci} className="flex-1 min-w-0 flex flex-col gap-2">
            {col.map((p) => (
              <MiniCard
                key={p.id}
                post={p}
                read={isRead(p.id)}
                saved={savedIds.has(p.id)}
                onOpen={onOpen}
                onSave={onSave}
              />
            ))}
          </div>
        ))}
      </div>
      <div ref={sentinel} className="h-px" />
    </>
  )
}

const MiniCard = memo(function MiniCard({
  post, read, saved, onOpen, onSave,
}: {
  post: Post
  read: boolean
  saved: boolean
  onOpen: (p: Post) => void
  onSave: (p: Post) => void
}) {
  const [imgError, setImgError] = useState(false)
  const hasImage = !!post.image && !imgError

  return (
    <div className={`relative transition-opacity ${read ? 'opacity-55' : ''}`}>
      <button onClick={() => onOpen(post)} className="block w-full text-left active:scale-[0.98] transition-transform">
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="block w-full min-h-[90px] max-h-[260px] rounded-2xl object-cover bg-black/5"
            />
            <div className="px-1 pt-1.5 pb-1">
              <h3 className="font-display text-[13px] leading-[1.25] font-semibold text-black line-clamp-3">{post.title}</h3>
              <SourceTag post={post} />
            </div>
          </>
        ) : (
          // Text-only: a small poster in the source colour
          <div className="relative overflow-hidden rounded-2xl px-3 pt-3 pb-3" style={{ backgroundColor: post.sourceColor }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
            <div className="relative text-white">
              <div className="pr-7 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85 truncate">{post.sourceName}</div>
              <h3 className="mt-1.5 font-display text-[15px] leading-[1.2] font-semibold line-clamp-5">{post.title}</h3>
            </div>
          </div>
        )}
      </button>
      <button
        onClick={() => onSave(post)}
        aria-label={saved ? 'Saved — add to another space' : 'Save to a space'}
        className="absolute top-1.5 right-1.5 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur active:scale-95"
      >
        <Bookmark size={15} className={saved ? 'fill-black text-black' : 'text-black/60'} />
      </button>
    </div>
  )
})

function SourceTag({ post }: { post: Post }) {
  return (
    <div className="mt-1 flex items-center gap-1.5 min-w-0">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: post.sourceColor }} />
      <span className="truncate text-[11px] text-black/45">{post.sourceName}</span>
    </div>
  )
}
