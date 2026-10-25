'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Bookmark, Home, LayoutGrid, Layers, Rss, SlidersHorizontal, Sparkles, Square } from 'lucide-react'
import type { Post, Space } from '@/lib/types'
import { lsGet, lsSet } from '@/lib/localStorage'
import { LS_KEYS } from '@/lib/storageKeys'
import { SwipeCard, type SwipeCardHandle } from './SwipeCard'
import { ReaderSheet } from './ReaderSheet'
import { SaveSheet } from './SaveSheet'
import { FilterSheet } from './FilterSheet'
import { SavedSheet } from './SavedSheet'
import { PinGrid } from './PinGrid'

// A daily "edition": a finite, diversified batch of unread stories.
// Finishing it is the goal — no infinite scroll.
const EDITION_SIZE = 30
const MORE_SIZE = 15
// Home grid renders this many more cards each time you near the bottom
const HOME_PAGE = 40
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
  /** Fetch the next page of posts from the server */
  onLoadMore: () => void
  canLoadMore: boolean
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

// Home grid is image-forward like Pinterest: two photo stories per text poster,
// each kept in ranked order, so news sources that post often but without
// images don't crowd the top.
function mixForGrid(posts: Post[]): Post[] {
  const withImg = posts.filter((p) => p.image)
  const text = posts.filter((p) => !p.image)
  const out: Post[] = []
  // Take the best-ranked post whose source isn't among the last few placed
  function take(list: Post[]) {
    if (!list.length) return
    const recent = new Set(out.slice(-4).map((p) => p.sourceId))
    const i = Math.max(0, list.findIndex((p) => !recent.has(p.sourceId)))
    out.push(list.splice(i, 1)[0])
  }
  while (withImg.length || text.length) {
    take(withImg)
    take(withImg)
    take(text)
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
  onLoadMore, canLoadMore,
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
  const [tab, setTab] = useState<'home' | 'today'>('home')
  const [todayView, setTodayView] = useState<'cards' | 'grid'>('cards')
  const [homeCount, setHomeCount] = useState(HOME_PAGE)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const homeRef = useRef<HTMLDivElement>(null)
  const todayGridRef = useRef<HTMLDivElement>(null)
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
  const cardsVisible = tab === 'today' && todayView === 'cards'
  useEffect(() => {
    if (!currentPost || !cardsVisible) return
    updateEdition((e) => (e.seen.includes(currentPost.id) ? e : { ...e, seen: [...e.seen, currentPost.id] }))
    if (currentIndex >= 3 && !hintDone) dismissHint()
  }, [currentPost?.id, cardsVisible]) // eslint-disable-line react-hooks/exhaustive-deps

  const savedIds = useMemo(
    () => new Set(Object.keys(postToSpaces).filter((id) => postToSpaces[id].length > 0)),
    [postToSpaces],
  )

  const homePosts = useMemo(() => mixForGrid(posts), [posts])

  function loadMoreHome() {
    if (homeCount < posts.length) setHomeCount((n) => n + HOME_PAGE)
    else if (canLoadMore) onLoadMore()
  }

  function scrollTodayToTop() {
    if (todayView === 'grid') todayGridRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    else scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // From the grid, jump straight to that story in the swipe view
  function jumpToCard(post: Post) {
    const idx = deck.findIndex((p) => p.id === post.id)
    setTodayView('cards')
    const sc = scrollerRef.current
    if (sc && idx >= 0) sc.scrollTo({ top: idx * sc.clientHeight })
  }

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

  // Hide a post from anywhere; posts in today's deck fly off their card first
  function hide(post: Post) {
    if (deck.some((p) => p.id === post.id)) { skip(post); return }
    onArchive(post)
    showToast('Hidden from your feed', () => onRestore(post.id))
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
      <div className="relative flex-1 min-h-0">
        {/* Home — Pinterest-style grid of everything in your feed */}
        <div
          ref={homeRef}
          aria-hidden={tab !== 'home'}
          className={`absolute inset-0 overflow-y-auto overscroll-contain bg-white ${tab === 'home' ? '' : 'invisible pointer-events-none'}`}
        >
          {/* Tapping the header jumps back to the top, like tapping the status bar in a native app */}
          <header
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return
              homeRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/90 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 backdrop-blur cursor-pointer select-none"
          >
            <div className="min-w-0">
              <div className="font-display text-[24px] font-semibold leading-none tracking-tight">Home</div>
              <div className="mt-1 text-[12px] text-black/40 truncate">
                {posts.length > 0 ? `${posts.length} stories · ${sourceCount} sources` : 'Loading your sources…'}
              </div>
            </div>
            <FilterButton active={filterKey !== 'all'} onClick={() => setFilterOpen(true)} />
          </header>

          {/* Today teaser */}
          {edition && deck.length > 0 && (
            <button
              onClick={() => setTab('today')}
              className="mx-2 mb-3 flex w-[calc(100%-16px)] items-center gap-3 rounded-2xl bg-black p-3 text-left text-white active:bg-black/85"
            >
              <span className="flex -space-x-2 shrink-0">
                {deck.slice(0, 3).map((p) =>
                  p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p.id} src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover ring-2 ring-black" />
                  ) : (
                    <span key={p.id} className="h-10 w-10 rounded-lg ring-2 ring-black" style={{ backgroundColor: p.sourceColor }} />
                  ),
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-semibold">Today&apos;s edition</span>
                <span className="block text-[12px] text-white/60">{deck.length} stories left · swipe through</span>
              </span>
              <Layers size={20} className="shrink-0 text-white/70" />
            </button>
          )}

          {posts.length === 0 ? (
            <GridSkeleton />
          ) : (
            <PinGrid
              posts={homePosts.slice(0, homeCount)}
              isRead={isRead}
              savedIds={savedIds}
              onOpen={openReader}
              onSave={(p) => startSave(p, false)}
              onEndReached={loadMoreHome}
            />
          )}
          <div className="py-6 text-center text-[12px] text-black/30">
            {homeCount < posts.length || canLoadMore ? 'Loading more…' : posts.length > 0 ? 'That’s everything for now.' : ''}
          </div>
        </div>

        {/* Today — swipe cards, or the same edition as a grid */}
        <div
          aria-hidden={tab !== 'today'}
          className={`absolute inset-0 bg-black ${tab === 'today' ? '' : 'invisible pointer-events-none'}`}
        >
          {/* Top bar — floats over the cards; solid over the grid */}
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[max(10px,env(safe-area-inset-top))] ${
              todayView === 'grid' ? 'bg-black pb-3' : ''
            }`}
          >
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
              <div className="flex items-center">
                {total > 0 && !caughtUp && todayView === 'cards' && (
                  <span className="mr-1 text-[13px] font-medium tabular-nums text-white/85">
                    {Math.min(currentIndex + 1 + (edition?.triaged.length ?? 0), total)} / {total}
                  </span>
                )}
                {todayView === 'cards' && currentIndex > 0 && (
                  <button
                    onClick={scrollTodayToTop}
                    aria-label="Back to the first story"
                    className="pointer-events-auto h-11 w-11 flex items-center justify-center rounded-full active:bg-white/15"
                  >
                    <ArrowUp size={21} className="drop-shadow" />
                  </button>
                )}
                <button
                  onClick={() => setTodayView((v) => (v === 'cards' ? 'grid' : 'cards'))}
                  aria-label={todayView === 'cards' ? 'Show as grid' : 'Show one at a time'}
                  className="pointer-events-auto h-11 w-11 flex items-center justify-center rounded-full active:bg-white/15"
                >
                  {todayView === 'cards' ? <LayoutGrid size={20} className="drop-shadow" /> : <Square size={19} className="drop-shadow" />}
                </button>
                <FilterButton light active={filterKey !== 'all'} onClick={() => setFilterOpen(true)} />
              </div>
            </div>
          </div>

          {/* Card stack — one story per screen */}
          <div
            ref={scrollerRef}
            className={`absolute inset-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory overscroll-contain scrollbar-hide bg-black ${
              todayView === 'cards' ? '' : 'invisible pointer-events-none'
            }`}
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
                    saved={savedIds.has(post.id)}
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

          {/* Grid view of the same edition */}
          {todayView === 'grid' && (
            <div
              ref={todayGridRef}
              className="absolute inset-0 overflow-y-auto overscroll-contain bg-white pt-[calc(96px+env(safe-area-inset-top))]"
            >
              <p className="px-4 pb-3 text-[13px] text-black/45">
                {deck.length > 0
                  ? `${deck.length} stories left in today’s edition. Tap one to swipe from there.`
                  : 'You’ve been through today’s edition.'}
              </p>
              <PinGrid
                posts={deck}
                isRead={isRead}
                savedIds={savedIds}
                onOpen={jumpToCard}
                onSave={(p) => startSave(p, false)}
              />
              <div className="h-8" />
            </div>
          )}
        </div>
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
      <nav className="shrink-0 grid grid-cols-5 bg-white border-t border-black/10 pb-[env(safe-area-inset-bottom)]">
        <TabButton
          icon={<Home size={22} />}
          label="Home"
          active={tab === 'home'}
          onClick={() => (tab === 'home' ? homeRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) : setTab('home'))}
        />
        <TabButton
          icon={<Layers size={22} />}
          label="Today"
          active={tab === 'today'}
          onClick={() => (tab === 'today' ? scrollTodayToTop() : setTab('today'))}
        />
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
        onSkip={(p) => { setReading(null); hide(p) }}
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

function FilterButton({ active, light, onClick }: { active: boolean; light?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Choose sources"
      className={`pointer-events-auto relative -mr-2 h-11 w-11 flex items-center justify-center rounded-full ${
        light ? 'text-white active:bg-white/15' : 'text-black active:bg-black/5'
      }`}
    >
      <SlidersHorizontal size={21} className={light ? 'drop-shadow' : ''} />
      {active && (
        <span className={`absolute top-2 right-2 h-2 w-2 rounded-full ring-2 ${light ? 'bg-white ring-black/30' : 'bg-black ring-white'}`} />
      )}
    </button>
  )
}

function GridSkeleton() {
  const heights = [[200, 140, 230], [150, 240, 170]]
  return (
    <div className="flex gap-2 px-2">
      {heights.map((col, i) => (
        <div key={i} className="flex-1 flex flex-col gap-2">
          {col.map((h, j) => <div key={j} className="skeleton rounded-2xl" style={{ height: h }} />)}
        </div>
      ))}
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
