'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, Layers, Rss, SlidersHorizontal, Sparkles } from 'lucide-react'
import type { Post, Space } from '@/lib/types'
import { lsGet, lsSet } from '@/lib/localStorage'
import { LS_KEYS } from '@/lib/storageKeys'
import { SwipeCard, type SwipeCardHandle } from './SwipeCard'
import { ReaderSheet } from './ReaderSheet'
import { SaveSheet } from './SaveSheet'
import { FilterSheet } from './FilterSheet'
import { SavedSheet } from './SavedSheet'

// A daily "edition": a finite, diversified batch of unread stories.
// Finishing it is the goal — no infinite scroll.
const EDITION_SIZE = 30
const MORE_SIZE = 15
// Build the edition once everything has loaded, or after this long if enough is in
const READY_FALLBACK_MS = 8000

interface Edition {
  date: string
  filterKey: string
  posts: Post[]
  seen: string[]
  triaged: string[]
  saved: number
  skipped: number
}

interface Toast {
  id: number
  message: string
  undo?: () => void
}

interface Props {
  posts: Post[]
  ready: boolean
  filterKey: string
  sourceCount: number
  isRead: (id: string) => boolean
  markRead: (id: string) => void
  spaces: Space[]
  postToSpaces: Record<string, { id: string; name: string }[]>
  onSaveToSpace: (post: Post, spaceId: string) => void
  onCreateSpaceAndSave: (post: Post, name: string) => void
  onArchive: (post: Post) => void
  onRestore: (postId: string) => void
  filterSources: { id: string; name: string; color: string }[]
  activeSources: Set<string>
  onToggleSource: (id: string) => void
  onResetSources: () => void
  onOpenSources: () => void
  onOpenAsk: () => void
}

// Walk the ranked list but cap each source, so an edition spans many sources
// instead of being dominated by whoever posts most often.
const PER_SOURCE_CAP = 2
function pickStories(ranked: Post[], size: number, skip: (p: Post) => boolean): Post[] {
  const picked: Post[] = []
  const perSource: Record<string, number> = {}
  const overflow: Post[] = []
  for (const p of ranked) {
    if (picked.length >= size) break
    if (skip(p)) continue
    const n = perSource[p.sourceId] ?? 0
    if (n >= PER_SOURCE_CAP) { overflow.push(p); continue }
    perSource[p.sourceId] = n + 1
    picked.push(p)
  }
  // Too few sources to fill the edition — top up in rank order
  return spreadImages([...picked, ...overflow.slice(0, size - picked.length)])
}

// Lead with a photo and space photos evenly through the text-only posters
function spreadImages(posts: Post[]): Post[] {
  const withImg = posts.filter((p) => p.image)
  const text = posts.filter((p) => !p.image)
  if (withImg.length === 0 || text.length === 0) return posts
  const gap = Math.max(1, Math.round(text.length / withImg.length))
  const out: Post[] = []
  while (withImg.length || text.length) {
    if (withImg.length) out.push(withImg.shift()!)
    out.push(...text.splice(0, gap))
  }
  return out
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function MobileFeed({
  posts, ready, filterKey, sourceCount, isRead, markRead, spaces, postToSpaces,
  onSaveToSpace, onCreateSpaceAndSave, onArchive, onRestore,
  filterSources, activeSources, onToggleSource, onResetSources, onOpenSources, onOpenAsk,
}: Props) {
  const router = useRouter()
  const [edition, setEdition] = useState<Edition | null>(() => lsGet<Edition>(LS_KEYS.MOBILE_EDITION))
  const [timedOut, setTimedOut] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reading, setReading] = useState<Post | null>(null)
  const [saving, setSaving] = useState<{ post: Post; fromSwipe: boolean } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [recentSpaceId, setRecentSpaceId] = useState<string | null>(() => lsGet<string>(LS_KEYS.MOBILE_RECENT_SPACE))
  const [hintDone, setHintDone] = useState(() => !!lsGet<boolean>(LS_KEYS.MOBILE_HINT_DONE))
  const scrollerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, SwipeCardHandle>())

  const updateEdition = useCallback((fn: (e: Edition) => Edition) => {
    setEdition((prev) => {
      if (!prev) return prev
      const next = fn(prev)
      lsSet(LS_KEYS.MOBILE_EDITION, next)
      return next
    })
  }, [])

  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => setTimedOut(true), READY_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [ready])

  const canBuild = ready || (timedOut && posts.length >= 10)

  const buildEdition = useCallback(() => {
    const fresh = pickStories(posts, EDITION_SIZE, (p) => isRead(p.id))
    const next: Edition = { date: today(), filterKey, posts: fresh, seen: [], triaged: [], saved: 0, skipped: 0 }
    lsSet(LS_KEYS.MOBILE_EDITION, next)
    setEdition(next)
    setCurrentIndex(0)
    scrollerRef.current?.scrollTo({ top: 0 })
  }, [posts, isRead, filterKey])

  // Start a new edition each day, or when the source filter changes
  useEffect(() => {
    if (!canBuild) return
    if (edition && edition.date === today() && edition.filterKey === filterKey) return
    buildEdition()
  }, [canBuild, filterKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const deck = useMemo(() => {
    if (!edition) return []
    const triaged = new Set(edition.triaged)
    return edition.posts.filter((p) => !triaged.has(p.id))
  }, [edition])

  const moreAvailable = useMemo(() => {
    if (!edition) return 0
    const inEdition = new Set(edition.posts.map((p) => p.id))
    return posts.filter((p) => !inEdition.has(p.id) && !isRead(p.id)).length
  }, [posts, edition, isRead])

  // Track which card is on screen
  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const idx = Number((entry.target as HTMLElement).dataset.index)
          if (!isNaN(idx)) setCurrentIndex(idx)
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [deck.length, edition?.date])

  const currentPost = deck[currentIndex]
  useEffect(() => {
    if (!currentPost) return
    updateEdition((e) => (e.seen.includes(currentPost.id) ? e : { ...e, seen: [...e.seen, currentPost.id] }))
    if (currentIndex >= 3 && !hintDone) dismissHint()
  }, [currentPost?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function dismissHint() {
    setHintDone(true)
    lsSet(LS_KEYS.MOBILE_HINT_DONE, true)
  }

  const showToast = useCallback((message: string, undo?: () => void) => {
    setToast({ id: Date.now(), message, undo })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function triage(postId: string, kind: 'saved' | 'skipped') {
    updateEdition((e) => ({
      ...e,
      triaged: [...e.triaged, postId],
      seen: e.seen.includes(postId) ? e.seen : [...e.seen, postId],
      saved: e.saved + (kind === 'saved' ? 1 : 0),
      skipped: e.skipped + (kind === 'skipped' ? 1 : 0),
    }))
  }

  async function skip(post: Post) {
    dismissHint()
    await cardRefs.current.get(post.id)?.flyOut('left')
    onArchive(post)
    triage(post.id, 'skipped')
    showToast('Hidden from your feed', () => {
      onRestore(post.id)
      updateEdition((e) => ({ ...e, triaged: e.triaged.filter((id) => id !== post.id), skipped: Math.max(0, e.skipped - 1) }))
    })
  }

  function startSave(post: Post, fromSwipe: boolean) {
    dismissHint()
    setSaving({ post, fromSwipe })
  }

  async function finishSave(post: Post, spaceName: string) {
    const fromSwipe = saving?.fromSwipe
    setSaving(null)
    showToast(`Saved to ${spaceName}`)
    if (fromSwipe) {
      await cardRefs.current.get(post.id)?.flyOut('right')
      triage(post.id, 'saved')
    }
  }

  function cancelSave() {
    if (saving?.fromSwipe) cardRefs.current.get(saving.post.id)?.reset()
    setSaving(null)
  }

  function openReader(post: Post) {
    markRead(post.id)
    setReading(post)
  }

  function openArticle(post: Post) {
    markRead(post.id)
    window.open(post.url, '_blank', 'noopener,noreferrer')
  }

  function keepGoing() {
    if (!edition) return
    const inEdition = new Set(edition.posts.map((p) => p.id))
    const more = pickStories(posts, MORE_SIZE, (p) => inEdition.has(p.id) || isRead(p.id))
    updateEdition((e) => ({ ...e, posts: [...e.posts, ...more] }))
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const total = edition?.posts.length ?? 0
  const done = edition ? new Set([...edition.seen, ...edition.triaged]).size : 0
  const caughtUp = !!edition && currentIndex >= deck.length
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-black text-black">
      {/* Top bar — floats over the cards */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300"
            style={{ width: total ? `${(caughtUp ? 1 : done / total) * 100}%` : '0%' }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
          <div className="min-w-0">
            <div className="font-display text-[19px] font-semibold leading-none tracking-tight">Today</div>
            <div className="mt-1 text-[12px] text-white/75">{dateLabel}</div>
          </div>
          <div className="flex items-center gap-1">
            {total > 0 && !caughtUp && (
              <span className="text-[13px] font-medium tabular-nums text-white/85">
                {Math.min(currentIndex + 1 + (edition?.triaged.length ?? 0), total)} / {total}
              </span>
            )}
            <button
              onClick={() => setFilterOpen(true)}
              aria-label="Choose sources"
              className="pointer-events-auto relative -mr-2 h-11 w-11 flex items-center justify-center rounded-full active:bg-white/15"
            >
              <SlidersHorizontal size={21} className="drop-shadow" />
              {filterKey !== 'all' && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white ring-2 ring-black/30" />}
            </button>
          </div>
        </div>
      </div>

      {/* Card stack — one story per screen */}
      <div
        ref={scrollerRef}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory overscroll-contain scrollbar-hide bg-black"
      >
        {!edition ? (
          <LoadingCard sourceCount={sourceCount} />
        ) : (
          <>
            {deck.map((post, i) => (
              <SwipeCard
                key={post.id}
                ref={(h) => { if (h) cardRefs.current.set(post.id, h); else cardRefs.current.delete(post.id) }}
                post={post}
                index={i}
                saved={(postToSpaces[post.id] ?? []).length > 0}
                showHint={!hintDone && i === 0}
                onTap={() => openReader(post)}
                onSwipeLeft={() => skip(post)}
                onSwipeRight={() => startSave(post, true)}
              />
            ))}
            <CaughtUp
              index={deck.length}
              saved={edition.saved}
              skipped={edition.skipped}
              read={edition.seen.length}
              empty={edition.posts.length === 0}
              moreAvailable={moreAvailable}
              onKeepGoing={keepGoing}
              onFresh={buildEdition}
              onOpenSaved={() => setSavedOpen(true)}
            />
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div key={toast.id} className="pointer-events-none absolute inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 animate-fade-in">
          <div className="pointer-events-auto flex items-center gap-4 rounded-full bg-black/90 py-2.5 pl-5 pr-2 text-[14px] text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
            <span>{toast.message}</span>
            {toast.undo ? (
              <button
                onClick={() => { toast.undo?.(); setToast(null) }}
                className="h-9 rounded-full px-4 font-semibold text-white bg-white/15 active:bg-white/25"
              >
                Undo
              </button>
            ) : (
              <span className="w-2" />
            )}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav className="shrink-0 grid grid-cols-4 bg-white border-t border-black/10 pb-[env(safe-area-inset-bottom)]">
        <TabButton icon={<Layers size={22} />} label="Today" active onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} />
        <TabButton icon={<Bookmark size={22} />} label="Saved" onClick={() => setSavedOpen(true)} />
        <TabButton icon={<Rss size={22} />} label="Sources" onClick={onOpenSources} />
        <TabButton icon={<Sparkles size={22} />} label="Ask" onClick={onOpenAsk} />
      </nav>

      <FilterSheet
        open={filterOpen}
        sources={filterSources}
        active={activeSources}
        onToggle={onToggleSource}
        onReset={onResetSources}
        onClose={() => setFilterOpen(false)}
        onLogout={logout}
      />
      <SavedSheet
        open={savedOpen}
        spaces={spaces}
        onClose={() => setSavedOpen(false)}
        onOpenPost={(p) => setReading(p)}
      />
      <ReaderSheet
        post={reading}
        savedIn={reading ? postToSpaces[reading.id] ?? [] : []}
        onClose={() => setReading(null)}
        onOpenArticle={openArticle}
        onSave={(p) => startSave(p, false)}
        onSkip={deck.some((p) => p.id === reading?.id) ? (p) => { setReading(null); skip(p) } : undefined}
      />
      <SaveSheet
        post={saving?.post ?? null}
        spaces={spaces.map((s) => ({ id: s.id, name: s.name }))}
        savedIn={saving ? postToSpaces[saving.post.id] ?? [] : []}
        recentSpaceId={recentSpaceId}
        onClose={cancelSave}
        onSave={(post, spaceId) => {
          onSaveToSpace(post, spaceId)
          setRecentSpaceId(spaceId)
          lsSet(LS_KEYS.MOBILE_RECENT_SPACE, spaceId)
          finishSave(post, spaces.find((s) => s.id === spaceId)?.name ?? 'space')
        }}
        onCreateAndSave={(post, name) => {
          onCreateSpaceAndSave(post, name)
          finishSave(post, name)
        }}
      />
    </div>
  )
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-black/5 ${active ? 'text-black' : 'text-black/40'}`}
    >
      {icon}
      {label}
    </button>
  )
}

function LoadingCard({ sourceCount }: { sourceCount: number }) {
  return (
    <section className="h-full w-full flex flex-col bg-white">
      <div className="skeleton h-[56%] w-full" style={{ borderRadius: 0 }} />
      <div className="px-5 pt-6 space-y-3">
        <div className="skeleton h-3 w-28 rounded-full" />
        <div className="skeleton h-7 w-full rounded" />
        <div className="skeleton h-7 w-4/5 rounded" />
        <p className="pt-4 text-[14px] text-black/40">
          Gathering today&apos;s edition{sourceCount > 0 ? ` from ${sourceCount} sources` : ''}…
        </p>
      </div>
    </section>
  )
}

function CaughtUp({
  index, saved, skipped, read, empty, moreAvailable, onKeepGoing, onFresh, onOpenSaved,
}: {
  index: number
  saved: number
  skipped: number
  read: number
  empty: boolean
  moreAvailable: number
  onKeepGoing: () => void
  onFresh: () => void
  onOpenSaved: () => void
}) {
  return (
    <section
      data-index={index}
      className="h-full w-full snap-start snap-always flex flex-col justify-center bg-black px-7 text-white"
    >
      <div className="text-[44px] leading-none">✦</div>
      <h2 className="mt-5 font-display text-[36px] leading-[1.05] font-semibold tracking-tight">
        {empty ? 'Nothing new right now.' : 'You’re caught up.'}
      </h2>
      <p className="mt-3 text-[16px] leading-relaxed text-white/60">
        {empty
          ? 'Every story from your sources has been read. Check back later.'
          : 'That’s today’s edition. Go read something long, or come back tomorrow.'}
      </p>

      {!empty && (
        <div className="mt-8 grid grid-cols-3 gap-2">
          <Stat value={read} label="seen" />
          <Stat value={saved} label="saved" />
          <Stat value={skipped} label="skipped" />
        </div>
      )}

      <div className="mt-8 space-y-2.5">
        {saved > 0 && (
          <button onClick={onOpenSaved} className="h-12 w-full rounded-full bg-white text-black text-[15px] font-semibold active:bg-white/85">
            Review what you saved
          </button>
        )}
        {moreAvailable > 0 && (
          <button
            onClick={onKeepGoing}
            className={`h-12 w-full rounded-full text-[15px] font-semibold ${
              saved > 0 ? 'border border-white/25 text-white active:bg-white/10' : 'bg-white text-black active:bg-white/85'
            }`}
          >
            {Math.min(moreAvailable, MORE_SIZE)} more stories
          </button>
        )}
        <button onClick={onFresh} className="h-12 w-full rounded-full text-[14px] text-white/50 active:bg-white/10">
          Start a fresh edition
        </button>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] px-3 py-3.5">
      <div className="font-display text-[26px] font-semibold leading-none tabular-nums">{value}</div>
      <div className="mt-1.5 text-[12px] uppercase tracking-[0.12em] text-white/45">{label}</div>
    </div>
  )
}
