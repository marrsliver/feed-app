'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Bookmark, X } from 'lucide-react'
import type { Post } from '@/lib/types'

export interface SwipeCardHandle {
  /** Animate the card off-screen, then resolve */
  flyOut: (dir: 'left' | 'right') => Promise<void>
  /** Return to centre (e.g. save sheet was cancelled) */
  reset: () => void
}

interface Props {
  post: Post
  index: number
  saved: boolean
  showHint: boolean
  onTap: () => void
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

const COMMIT_PX = 96
const LOCK_PX = 10

function timeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime()
  if (isNaN(then)) return ''
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { post, index, saved, showHint, onTap, onSwipeLeft, onSwipeRight },
  ref,
) {
  const [dx, setDx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [imgError, setImgError] = useState(false)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const axis = useRef<'x' | 'y' | null>(null)
  // Set when a gesture moved the card, so the click that follows isn't treated as a tap
  const dragged = useRef(false)

  useImperativeHandle(ref, () => ({
    flyOut: (dir) =>
      new Promise<void>((resolve) => {
        setAnimating(true)
        setDx(dir === 'right' ? window.innerWidth * 1.3 : -window.innerWidth * 1.3)
        setTimeout(resolve, 260)
      }),
    reset: () => {
      setAnimating(true)
      setDx(0)
    },
  }))

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    axis.current = null
    dragged.current = false
    setAnimating(false)
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    if (!axis.current) {
      if (Math.abs(mx) < LOCK_PX && Math.abs(my) < LOCK_PX) return
      axis.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      dragged.current = true
      if (axis.current === 'x') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    if (axis.current === 'x') setDx(mx)
  }

  function onPointerUp() {
    const s = start.current
    start.current = null
    if (!s || axis.current !== 'x') return
    setAnimating(true)
    if (dx > COMMIT_PX) {
      navigator.vibrate?.(8)
      onSwipeRight()
    } else if (dx < -COMMIT_PX) {
      navigator.vibrate?.(8)
      onSwipeLeft()
    } else {
      setDx(0)
    }
  }

  const progress = Math.min(Math.abs(dx) / COMMIT_PX, 1)
  const hasImage = !!post.image && !imgError
  const excerpt = post.excerpt?.replace(/\s+/g, ' ').trim()

  return (
    <section
      data-index={index}
      className="mobile-card relative h-full w-full snap-start snap-always overflow-hidden"
    >
      <article
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => { if (!dragged.current) onTap() }}
        className="absolute inset-0 flex flex-col bg-white select-none touch-pan-y cursor-pointer"
        style={{
          transform: `translateX(${dx}px) rotate(${dx / 24}deg)`,
          transition: animating ? 'transform 0.26s cubic-bezier(0.2, 0.7, 0.3, 1)' : 'none',
          transformOrigin: '50% 120%',
        }}
      >
        {hasImage ? (
          <>
            <div className="relative h-[56%] shrink-0 bg-black/5 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image}
                alt=""
                draggable={false}
                loading={index < 2 ? 'eager' : 'lazy'}
                decoding="async"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
            </div>
            <div className="flex-1 min-h-0 flex flex-col px-5 pt-5 pb-4">
              <SourceLine post={post} />
              <h2 className="mt-2.5 font-display text-[25px] leading-[1.15] font-semibold tracking-tight text-black line-clamp-4">
                {post.title}
              </h2>
              {excerpt && (
                <p className="mt-3 text-[15px] leading-relaxed text-black/55 line-clamp-3">{excerpt}</p>
              )}
              <Footer post={post} saved={saved} />
            </div>
          </>
        ) : (
          // Text-only posts become a full-bleed poster in the source's colour
          <div className="relative flex-1 flex flex-col px-6 pt-24 pb-5" style={{ backgroundColor: post.sourceColor }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/30" />
            <div className="relative flex-1 min-h-0 flex flex-col text-white">
              <SourceLine post={post} light />
              <h2 className="mt-4 font-display text-[34px] leading-[1.08] font-semibold tracking-tight line-clamp-6">
                {post.title}
              </h2>
              {excerpt && <p className="mt-4 text-[16px] leading-relaxed text-white/80 line-clamp-5">{excerpt}</p>}
              <Footer post={post} saved={saved} light />
            </div>
          </div>
        )}

        {/* Swipe stamps */}
        <div
          className="pointer-events-none absolute top-24 left-6 flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-lg"
          style={{ opacity: dx > 0 ? progress : 0, transform: `scale(${0.8 + progress * 0.2})` }}
        >
          <Bookmark size={15} className="fill-white" /> Save
        </div>
        <div
          className="pointer-events-none absolute top-24 right-6 flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-lg ring-1 ring-black/10"
          style={{ opacity: dx < 0 ? progress : 0, transform: `scale(${0.8 + progress * 0.2})` }}
        >
          <X size={15} /> Not for me
        </div>

        {showHint && dx === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-11 flex justify-center animate-fade-in">
            <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] font-medium text-white backdrop-blur">
              ← skip · tap to read · save →
            </div>
          </div>
        )}
      </article>
    </section>
  )
})

function SourceLine({ post, light }: { post: Post; light?: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/60"
        style={{ backgroundColor: light ? '#fff' : post.sourceColor }}
      />
      <span
        className="truncate text-[12px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: light ? 'rgba(255,255,255,0.9)' : post.sourceColor }}
      >
        {post.sourceName}
      </span>
      <span className={`shrink-0 text-[12px] ${light ? 'text-white/60' : 'text-black/35'}`}>· {timeAgo(post.date)}</span>
    </div>
  )
}

function Footer({ post, saved, light }: { post: Post; saved: boolean; light?: boolean }) {
  let host = ''
  try { host = new URL(post.url).hostname.replace(/^www\./, '') } catch {}
  return (
    <div className={`mt-auto pt-3 flex items-center justify-between text-[13px] ${light ? 'text-white/70' : 'text-black/35'}`}>
      <span className="truncate">{host}</span>
      {saved && (
        <span className={`flex items-center gap-1 font-medium ${light ? 'text-white' : 'text-black'}`}>
          <Bookmark size={13} className={light ? 'fill-white' : 'fill-black'} /> Saved
        </span>
      )}
    </div>
  )
}
