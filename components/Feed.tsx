'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useInfiniteQuery, useQueries } from '@tanstack/react-query'
import Masonry from 'react-masonry-css'
import { Loader2, BookmarkCheck, BookmarkIcon, Sparkles, Archive, Rss, Shuffle } from 'lucide-react'
import type { LibrarySource, PostsApiResponse, Post, SpaceItem } from '@/lib/types'
import { rankPosts, rankPostsDiversified } from '@/lib/rankPosts'
import { PostCard } from './PostCard'
import { SourceFilter } from './SourceFilter'
import { SearchBar } from './SearchBar'
import { ListsSidebar } from './ListsSidebar'
import { AskPanel } from './AskPanel'
import { AddLinkPanel } from './AddLinkPanel'
import { ArchivePanel } from './ArchivePanel'
import { SourcesSidebar } from './SourcesSidebar'
import { SourcesCardsView } from './SourcesCardsView'
import { SourcePanel } from './SourcePanel'
import { PostPanel } from './PostPanel'
import { SelectSourcesModal } from './SelectSourcesModal'
import { TagSourcesPanel } from './TagSourcesPanel'
import { useSpaces } from '@/hooks/useSpaces'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useSourceItems } from '@/hooks/useSourceItems'
import { useSourceLists } from '@/hooks/useSourceLists'
import { useSourceCategories } from '@/hooks/useSourceCategories'
import { useSourceIndustries } from '@/hooks/useSourceIndustries'
import { useManualPosts } from '@/hooks/useManualPosts'
import { useDeletedPosts } from '@/hooks/useDeletedPosts'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useReadPosts } from '@/hooks/useReadPosts'

interface Props {
  feedId: string
  showSources?: boolean
  openSourcesCards?: number
}

async function fetchPosts(
  page: number,
  activeSources: string[],
  query: string
): Promise<PostsApiResponse> {
  const params = new URLSearchParams({
    page: String(page),
    ...(activeSources.length > 0 && { sources: activeSources.join(',') }),
    ...(query && { q: query }),
  })
  const res = await fetch(`/api/posts?${params}`)
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

const BREAKPOINTS = {
  default: 4,
  1280: 3,
  1024: 3,
  768: 2,
  640: 1,
}

const SKELETON_HEIGHTS = [180, 260, 140, 220, 300, 160, 240, 190, 280, 150, 210, 170]

function FeedSkeleton() {
  return (
    <Masonry
      breakpointCols={BREAKPOINTS}
      className="flex -ml-4 w-auto"
      columnClassName="pl-4 bg-clip-padding"
    >
      {SKELETON_HEIGHTS.map((h, i) => (
        <div key={i} className="break-inside-avoid mb-4">
          <div className="skeleton" style={{ height: h }} />
        </div>
      ))}
    </Masonry>
  )
}

async function fetchUserSourcePosts(source: LibrarySource, page: number): Promise<{ posts: Post[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    url: source.feedUrl,
    sourceId: source.id,
    sourceName: source.name,
    sourceColor: source.color,
    page: String(page),
  })
  const res = await fetch(`/api/rss?${params}`)
  if (!res.ok) return { posts: [], hasMore: false }
  const data = await res.json()
  return { posts: data.posts ?? [], hasMore: data.hasMore ?? false }
}

export function Feed({ feedId, showSources, openSourcesCards: openSourcesCardsProp }: Props) {
  const router = useRouter()
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [view, setView] = useState<string>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [sourcesCardsOpen, setSourcesCardsOpen] = useState(false)
  // Store IDs, not object snapshots — always resolve to live source from allSources
  const [sidebarSelectedSourceId, setSidebarSelectedSourceId] = useState<string | null>(null)
  const [sourcesCardsPanelId, setSourcesCardsPanelId] = useState<string | null>(null)
  const [sourceOpenedFromPost, setSourceOpenedFromPost] = useState(false)
  const [openPost, setOpenPost] = useState<Post | null>(null)
  const [openPieceModal, setOpenPieceModal] = useState<Post | null>(null)
  const [sidebarTagPanel, setSidebarTagPanel] = useState<string | null>(null)
  const [panelHistory, setPanelHistory] = useState<Array<
    | { type: 'source'; id: string }
    | { type: 'post'; post: Post }
    | { type: 'sidebar' }
    | { type: 'cards' }
  >>([])

  // Only one inline panel open at a time
  function openSidebarSource(id: string | null, skipHistory = false) {
    if (!skipHistory && id) {
      if (openPost) {
        setPanelHistory(h => [...h, { type: 'post', post: openPost }])
      } else if (sidebarSelectedSourceId) {
        setPanelHistory(h => [...h, { type: 'source', id: sidebarSelectedSourceId }])
      } else if (sourcesCardsOpen || sourcesCardsPanelId) {
        setPanelHistory(h => [...h, { type: 'cards' }])
      } else if (sourcesOpen) {
        setPanelHistory(h => [...h, { type: 'sidebar' }])
      }
    }
    setSidebarSelectedSourceId(id)
    if (id) { setSourcesCardsPanelId(null); setOpenPost(null); setOpenPieceModal(null) }
  }
  function openSourcesCardsPanel(id: string | null, skipHistory = false) {
    if (!skipHistory && id) {
      if (openPost) {
        setPanelHistory(h => [...h, { type: 'post', post: openPost }])
      } else if (sidebarSelectedSourceId) {
        setPanelHistory(h => [...h, { type: 'source', id: sidebarSelectedSourceId }])
      } else if (sourcesOpen) {
        setPanelHistory(h => [...h, { type: 'sidebar' }])
      }
    }
    setSourcesCardsPanelId(id)
    if (id) { setSidebarSelectedSourceId(null); setOpenPost(null); setOpenPieceModal(null) }
  }
  function openPostInline(post: Post | null, skipHistory = false) {
    if (!skipHistory && post) {
      if (sidebarSelectedSourceId) {
        setPanelHistory(h => [...h, { type: 'source', id: sidebarSelectedSourceId }])
      } else if (sourcesCardsPanelId) {
        setPanelHistory(h => [...h, { type: 'cards' }])
      }
    }
    setOpenPost(post)
    if (post) { setSidebarSelectedSourceId(null); setSourcesCardsPanelId(null) }
  }
  function handlePanelBack() {
    const last = panelHistory[panelHistory.length - 1]
    if (!last) { handlePanelClose(); return }
    setPanelHistory(h => h.slice(0, -1))
    if (last.type === 'sidebar') {
      setSidebarSelectedSourceId(null)
      setSourcesCardsPanelId(null)
      setOpenPost(null)
      // sourcesOpen stays true — user sees the sidebar list again
    } else if (last.type === 'cards') {
      setSidebarSelectedSourceId(null)
      setSourcesCardsPanelId(null)
      setOpenPost(null)
      // sourcesCardsOpen stays true
    } else if (last.type === 'source') {
      setSidebarSelectedSourceId(last.id)
      setSourcesCardsPanelId(null)
      setOpenPost(null)
    } else {
      setOpenPost(last.post)
      setSidebarSelectedSourceId(null)
      setSourcesCardsPanelId(null)
    }
  }
  function handlePanelClose() {
    setPanelHistory([])
    setSidebarSelectedSourceId(null)
    setSourcesCardsPanelId(null)
    setOpenPost(null)
    setOpenPieceModal(null)
    setSourceOpenedFromPost(false)
  }
  const [includeAssociated, setIncludeAssociated] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [shuffleSeed, setShuffleSeed] = useState<number | null>(null)
  const [selectSourcesOpen, setSelectSourcesOpen] = useState(false)
  const { isRead, markRead } = useReadPosts()

  // Open sources cards view when triggered by parent (e.g. header tab)
  const prevOpenTick = useRef(0)
  useEffect(() => {
    if (openSourcesCardsProp && openSourcesCardsProp !== prevOpenTick.current) {
      prevOpenTick.current = openSourcesCardsProp
      setSourcesCardsOpen(true)
    }
  }, [openSourcesCardsProp])

  const {
    sources: allSources,
    staticSources,
    userSources,
    allTags,
    loaded: sourcesLoaded,
    addSource,
    removeSource,
    renameSource,
    toggleFeed,
    setCategory,
    setIndustry,
    addTag,
    removeTag,
    addSourceCard,
    removeSourceCard,
    addAssociation,
    removeAssociation,
    setSummary,
  } = useLibrarySources()

  const { sourceLists, createSourceList, deleteSourceList, renameSourceList, toggleSourceInList } = useSourceLists()
  const { categories, createCategory } = useSourceCategories()
  const { industries, createIndustry } = useSourceIndustries()
  const { spaces, lists, createSpace, createList, deleteList, renameList, addNote, addPost: addPostToSpace, postToSpaces, commentToSpaces } = useSpaces()
  const { appendItem: appendSourceItem } = useSourceItems()
  const otherFeedId = feedId === 'research' ? 'music' : 'research'
  const { posts: manualPosts, addPost, movePost, removePost } = useManualPosts(feedId)
  const { deletedPosts, hiddenIds, archivePost, restorePost } = useDeletedPosts()

  // Static sources for this feed group
  const feedStaticSources = useMemo(
    () => staticSources.filter((s) => s.feedGroup === feedId),
    [staticSources, feedId]
  )

  // User sources in the feed (non-static, inFeed=true) — used for RSS fetching only
  const feedUserSources = useMemo(() => userSources.filter((s) => s.inFeed), [userSources])

  // All source IDs for RSS/API fetching (feed sources only — don't fire 100+ requests)
  const allSourceIds = useMemo(
    () => [...feedStaticSources.map((s) => s.id), ...feedUserSources.map((s) => s.id)],
    [feedStaticSources, feedUserSources]
  )

  // Populate activeSources when library loads
  useEffect(() => {
    if (!sourcesLoaded) return
    setActiveSources((prev) => {
      if (prev.size > 0) {
        // Add any newly-added feed sources so they appear active immediately
        const next = new Set(prev)
        allSourceIds.forEach((id) => next.add(id))
        return next
      }
      return new Set(allSourceIds)
    })
  }, [sourcesLoaded, allSourceIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to 'all' if active list is deleted
  useEffect(() => {
    if (view !== 'all' && !lists.find((l) => l.id === view)) {
      setView('all')
    }
  }, [lists, view])

  const activeSourcesList = [...activeSources]

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ['posts', activeSourcesList.sort().join(','), query],
      queryFn: ({ pageParam }) =>
        fetchPosts(pageParam as number, activeSourcesList, query),
      initialPageParam: 1,
      getNextPageParam: (last) => last.nextPage ?? undefined,
      enabled: feedStaticSources.length > 0,
    })

  const toggleSource = useCallback((id: string) => {
    setActiveSources((prev) => {
      // If all feed sources are active, first click spotlights just this source
      if (prev.size === allSourceIds.length) return new Set([id])
      // Otherwise multi-select: toggle this source in/out
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // Deselecting the last one resets to all
        if (next.size === 0) return new Set(allSourceIds)
      } else {
        next.add(id)
      }
      return next
    })
  }, [allSourceIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Paginated user-source fetching
  const [userSourcePage, setUserSourcePage] = useState(1)
  const [accumulatedUserPosts, setAccumulatedUserPosts] = useState<Post[]>([])
  const [userHasMore, setUserHasMore] = useState(false)
  const processedPages = useRef(new Set<number>())
  const prevSourceIds = useRef('')

  useEffect(() => {
    const ids = feedUserSources.map((s) => s.id).sort().join(',')
    if (ids === prevSourceIds.current) return
    prevSourceIds.current = ids
    setUserSourcePage(1)
    setAccumulatedUserPosts([])
    setUserHasMore(feedUserSources.length > 0)
    processedPages.current = new Set()
  }, [feedUserSources])

  const userSourceResults = useQueries({
    queries: feedUserSources.map((source) => ({
      queryKey: ['user-source', source.id, userSourcePage],
      queryFn: () => fetchUserSourcePosts(source, userSourcePage),
      staleTime: 1000 * 60 * 5,
    })),
  })

  useEffect(() => {
    if (feedUserSources.length === 0) return
    if (userSourceResults.some((r) => r.isPending)) return
    if (processedPages.current.has(userSourcePage)) return
    processedPages.current.add(userSourcePage)
    const newPosts = userSourceResults.flatMap((r) => r.data?.posts ?? [])
    const anyHasMore = userSourceResults.some((r) => r.data?.hasMore ?? false)
    setAccumulatedUserPosts((prev) => [...prev, ...newPosts])
    setUserHasMore(anyHasMore)
  }, [userSourceResults, userSourcePage, feedUserSources.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const userSourcesLoading = userSourceResults.some((r) => r.isPending)

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    } else if (userHasMore && !userSourcesLoading) {
      setUserSourcePage((p) => p + 1)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, userHasMore, userSourcesLoading])

  const canLoadMore = (hasNextPage && !isFetchingNextPage) || (userHasMore && !userSourcesLoading)
  const sentinelRef = useInfiniteScroll(loadMore, canLoadMore)

  const fetchedPosts: Post[] = useMemo(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data]
  )

  // Compute associated source objects for the active filter sources (excluded ones only)
  const associatedSources = useMemo(() => {
    if (activeSources.size === 0 || activeSources.size === allSourceIds.length) return []
    const extraIds = new Set<string>()
    for (const source of allSources) {
      if (!activeSources.has(source.id)) continue
      for (const assocId of source.associations ?? []) {
        if (!activeSources.has(assocId)) extraIds.add(assocId)
      }
    }
    return [...extraIds]
      .map(id => allSources.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map(s => ({ id: s.id, name: s.name, color: s.color }))
  }, [activeSources, allSources, allSourceIds.length])

  const allPosts = useMemo(() => {
    const seenIds = new Set<string>()
    const filtered = [...manualPosts, ...fetchedPosts, ...accumulatedUserPosts]
      .filter((p) => { if (seenIds.has(p.id)) return false; seenIds.add(p.id); return true })
      .filter((p) => !hiddenIds.includes(p.id))
      .filter((p) => p.sourceId === 'manual' || activeSources.has(p.sourceId) || (includeAssociated && associatedSources.some(s => s.id === p.sourceId)))
    return shuffleSeed !== null ? rankPostsDiversified(filtered, shuffleSeed) : rankPosts(filtered)
  }, [manualPosts, fetchedPosts, accumulatedUserPosts, hiddenIds, activeSources, includeAssociated, associatedSources, shuffleSeed])
  const activeList = lists.find((l) => l.id === view)
  const listFiltered =
    view === 'all'
      ? allPosts
      : allPosts.filter((p) => activeList?.postIds?.includes(p.id) || activeList?.items.some((i) => i.type === 'post' && i.refId === p.id))
  const displayPosts = showUnreadOnly
    ? listFiltered.filter((p) => !isRead(p.id))
    : listFiltered

  const isFiltering = view !== 'all'
  const unreadCount = allPosts.filter((p) => !isRead(p.id)).length

  // Live-resolved sources (never stale snapshots)
  const sidebarSelectedSource = sidebarSelectedSourceId
    ? allSources.find((s) => s.id === sidebarSelectedSourceId) ?? null
    : null
  const sourcesCardsPanelSource = sourcesCardsPanelId
    ? allSources.find((s) => s.id === sourcesCardsPanelId) ?? null
    : null

  // Sources for the filter bar — only sources that contribute content to this feed
  const filterSources = useMemo(() => [
    ...feedStaticSources.map((s) => ({ id: s.id, name: s.name, url: s.url, type: s.type, color: s.color, feedUrl: s.feedUrl, categoryId: s.categoryId, industryId: s.industryId })),
    ...feedUserSources.map((s) => ({ id: s.id, name: s.name, url: s.url, type: s.type, color: s.color, feedUrl: s.feedUrl, categoryId: s.categoryId, industryId: s.industryId })),
  ].sort((a, b) => a.name.localeCompare(b.name)), [feedStaticSources, feedUserSources])

  // All library sources for the filter modal (includes library-only sources for association filtering)
  const allSourcesForModal = useMemo(() =>
    [...allSources]
      .map((s) => ({ id: s.id, name: s.name, url: s.url ?? '', type: s.type, color: s.color, feedUrl: s.feedUrl ?? '', categoryId: s.categoryId, industryId: s.industryId }))
      .sort((a, b) => a.name.localeCompare(b.name))
  , [allSources])

  // Reset includeAssociated when all sources are active (no spotlight)
  useEffect(() => {
    if (activeSources.size === allSourceIds.length) setIncludeAssociated(false)
  }, [activeSources.size, allSourceIds.length])

  return (
    <>
    <div className="flex items-start gap-0 min-w-0">
    <div className="flex-1 min-w-0 space-y-4">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-black/10 pb-3 pt-4 space-y-3">
        <div className="flex items-center gap-2">

          {/* Group 1: Sources (research feed only) */}
          {showSources && (
            <>
              <button
                onClick={() => setSourcesOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
              >
                <Rss size={12} />
                Sources
              </button>
              <div className="w-px h-4 bg-black/10 shrink-0" />
            </>
          )}

          {/* Search */}
          <div className="flex-1 min-w-0">
            <SearchBar value={query} onChange={setQuery} />
          </div>

          {/* Group 2: Primary actions */}
          <div className="shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => setSourcesOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors"
            >
              <Rss size={12} />
              Add source
            </button>
            <button
              onClick={() => setAskOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
            >
              <Sparkles size={12} />
              Ask
            </button>
          </div>

          <div className="w-px h-4 bg-black/10 shrink-0" />

          {/* Group 3: Display toggles */}
          <div className="shrink-0 flex items-center gap-1.5">
            {/* Unread filter toggle */}
            <button
              onClick={() => setShowUnreadOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors ${
                showUnreadOnly
                  ? 'bg-black text-white border-black'
                  : 'border-black/15 text-black/50 hover:border-black/40 hover:text-black'
              }`}
            >
              Unread
              {!showUnreadOnly && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold bg-black/10 text-black/60 leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Shuffle */}
            <button
              onClick={() => setShuffleSeed(s => s !== null ? null : Date.now())}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors ${
                shuffleSeed !== null
                  ? 'bg-black text-white border-black'
                  : 'border-black/15 text-black/50 hover:border-black/40 hover:text-black'
              }`}
              title="Shuffle feed order — click again to reshuffle"
            >
              <Shuffle size={12} />
              Shuffle
            </button>

            {/* Filter sources */}
            {filterSources.length > 1 && (
              <button
                onClick={() => setSelectSourcesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
              >
                Filter
              </button>
            )}
          </div>

          <div className="w-px h-4 bg-black/10 shrink-0" />

          {/* Group 4: Organize */}
          <div className="shrink-0 flex items-center gap-1.5">
            {/* Archive */}
            {deletedPosts.length > 0 && (
              <button
                onClick={() => setArchiveOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
                title={`${deletedPosts.length} archived card${deletedPosts.length !== 1 ? 's' : ''}`}
              >
                <Archive size={12} />
                <span className="text-[9px] font-bold">{deletedPosts.length}</span>
              </button>
            )}

            {/* Lists button / active filter chip */}
            {isFiltering ? (
              <div className="flex items-center border border-black bg-black text-white text-xs font-medium overflow-hidden">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 hover:bg-black/80 transition-colors"
                >
                  <BookmarkCheck size={12} />
                  {activeList?.name}
                </button>
                <button
                  onClick={() => setView('all')}
                  aria-label="Clear filter"
                  className="pr-2.5 pl-1 py-1.5 hover:bg-black/80 transition-colors text-white/50 hover:text-white text-sm leading-none"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
              >
                <BookmarkIcon size={12} />
                Spaces
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 min-w-0">
          <div className="flex-1 min-w-0">
            <SourceFilter
              sources={filterSources}
              active={activeSources}
              onToggle={toggleSource}
              onReset={() => setActiveSources(new Set(allSourceIds))}
              onToggleIncludeAssociated={() => setIncludeAssociated(v => !v)}
              includeAssociated={includeAssociated}
              associatedSources={associatedSources}
            />
          </div>
        </div>
      </div>

      {/* Sources sidebar */}
      {sourcesOpen && (
        <SourcesSidebar
          feedId={feedId}
          staticSources={feedStaticSources}
          allStaticSources={staticSources}
          userSources={userSources}
          categories={categories}
          industries={industries}
          onAddSource={addSource}
          onRemoveSource={removeSource}
          onRenameSource={renameSource}
          onToggleFeed={toggleFeed}
          onCreateCategory={createCategory}
          onCreateIndustry={createIndustry}
          onOpenSource={(id) => {
            openSidebarSource(id)
          }}
          onClose={() => setSourcesOpen(false)}
          onShowCards={() => { setSourcesOpen(false); setSourcesCardsOpen(true) }}
          elevated={sourcesCardsOpen}
          onAddAssociation={addAssociation}
        />
      )}

      {/* Sources cards view */}
      {sourcesCardsOpen && (
        <SourcesCardsView
          sources={allSources}
          categories={categories}
          industries={industries}
          allTags={allTags}
          sourceLists={sourceLists}
          onSetCategory={setCategory}
          onSetIndustry={setIndustry}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onToggleSourceInList={toggleSourceInList}
          onCreateSourceList={createSourceList}
          onCreateCategory={createCategory}
          onCreateIndustry={createIndustry}
          onToggleFeed={toggleFeed}
          onRenameSource={renameSource}
          onShowLibrary={() => { setSourcesOpen(true) }}
          onClose={() => setSourcesCardsOpen(false)}
          allFeedPosts={allPosts}
          savedLists={lists}
          isRead={isRead}
          selectedId={sourcesCardsPanelId}
          onSelectSource={openSourcesCardsPanel}
          onAddSourceCard={addSourceCard}
          onRemoveSourceCard={removeSourceCard}
        />
      )}

      {/* Add link panel */}
      {addLinkOpen && (
        <AddLinkPanel feedId={feedId} onAdd={addPost} onClose={() => setAddLinkOpen(false)} />
      )}

      {/* Archive panel */}
      {archiveOpen && (
        <ArchivePanel
          records={deletedPosts}
          onRestore={restorePost}
          onClose={() => setArchiveOpen(false)}
        />
      )}

      {/* Ask panel */}
      {askOpen && (
        <AskPanel posts={allPosts} onClose={() => setAskOpen(false)} />
      )}


      {/* TagSourcesPanel opened from sidebar context */}
      {sidebarTagPanel && (
        <TagSourcesPanel
          tag={sidebarTagPanel}
          sources={allSources}
          categories={categories}
          allTags={allTags}
          onSetCategory={setCategory}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onCreateCategory={createCategory}
          onClose={() => setSidebarTagPanel(null)}
        />
      )}

      {/* Select Sources modal */}
      {selectSourcesOpen && (
        <SelectSourcesModal
          sources={allSourcesForModal}
          activeSources={activeSources}
          feedSourceIds={new Set(allSourceIds)}
          categories={categories}
          industries={industries}
          initialIncludeAssociated={includeAssociated}
          hasAssociations={allSources.some(s => (s.associations ?? []).length > 0)}
          onConfirm={(selected, incAssoc) => { setActiveSources(selected); setIncludeAssociated(incAssoc) }}
          onClose={() => setSelectSourcesOpen(false)}
        />
      )}

      {/* Lists sidebar */}
      {sidebarOpen && (
        <ListsSidebar
          lists={lists}
          view={view}
          onSetView={setView}
          onClose={() => setSidebarOpen(false)}
          onCreate={createList}
          onRename={renameList}
          onDelete={deleteList}
        />
      )}

      {/* Skeleton loader */}
      {status === 'pending' && feedStaticSources.length > 0 && <FeedSkeleton />}

      {status === 'error' && (
        <div className="text-center py-20 text-red-500 text-sm">
          Failed to load posts. Check your internet connection and try again.
        </div>
      )}

      {(status === 'success' || feedStaticSources.length === 0) && displayPosts.length === 0 && (
        <div className="text-center py-20 text-black/25 text-sm">
          {view !== 'all'
            ? `No posts saved to "${activeList?.name}" yet.`
            : feedStaticSources.length === 0
            ? 'Add links using the Add button above.'
            : 'No posts found.'}
        </div>
      )}

      {/* Masonry grid */}
      {displayPosts.length > 0 && (
        <Masonry
          breakpointCols={BREAKPOINTS}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {displayPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              feedId={feedId}
              isRead={isRead(post.id)}
              onRead={() => markRead(post.id)}
              onMove={post.sourceId === 'manual' ? () => movePost(post.id, otherFeedId) : undefined}
              onDelete={() => {
                archivePost(post, feedId, post.sourceId === 'manual')
                if (post.sourceId === 'manual') removePost(post.id)
              }}
              onOpenPost={(post) => openPostInline(post)}
              onOpenSource={(sourceId) => {
                openSidebarSource(sourceId)
                setSourceOpenedFromPost(true)
              }}
              onSavedToSpace={(post) => addSourceCard(post.sourceId, { id: post.id, url: post.url, title: post.title, addedAt: Date.now() })}
              savedInSpaces={postToSpaces[post.id] ?? []}
              onNavigateToSpace={(spaceId) => {
                try { sessionStorage.setItem('pendingOpenPost', JSON.stringify(post)) } catch {}
                router.push(`/remix?space=${spaceId}`)
              }}
            />
          ))}
        </Masonry>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading more indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-black/20" size={24} />
        </div>
      )}

      {/* End of feed */}
      {status === 'success' && !hasNextPage && displayPosts.length > 0 && (
        <p className="text-center text-xs text-black/25 py-4">You&apos;ve reached the end.</p>
      )}
    </div>

    {/* Inline panels — sticky alongside feed */}
    {openPost && (
      <PostPanel
        inline
        post={openPost}
        feedId={feedId}
        onRead={() => markRead(openPost.id)}
        onOpenSource={(sourceId) => {
          openSidebarSource(sourceId)
          setSourceOpenedFromPost(true)
        }}
        onNavigateToSpace={(spaceId) => {
          try { if (openPost) sessionStorage.setItem('pendingOpenPost', JSON.stringify(openPost)) } catch {}
          router.push(`/remix?space=${spaceId}`)
        }}
        allSpaces={spaces.filter(s => !s.deletedAt).map(s => ({ id: s.id, name: s.name }))}
        onAddNoteToSpaceId={(content, spaceId, commentId) => addNote(spaceId, content, { postRef: openPost ?? undefined, sourceRef: openPost?.sourceId, commentId })}
        onCreateSpace={(name, noteContent, commentId) => { const id = createSpace(name); addNote(id, noteContent, { postRef: openPost ?? undefined, sourceRef: openPost?.sourceId, commentId }) }}
        onSavedToSpace={(post) => addSourceCard(post.sourceId, { id: post.id, url: post.url, title: post.title, addedAt: Date.now() })}
        commentToSpaces={commentToSpaces}
        onSavePostToSpace={(spaceId) => {
          if (!openPost) return
          const already = spaces.find((s) => s.id === spaceId)?.items.some((i) => i.type === 'post' && i.refId === openPost.id)
          if (!already) {
            const sourceRef = openPost.sourceId !== 'manual' ? openPost.sourceId : undefined
            addPostToSpace(spaceId, openPost, { sourceRef, cardRef: sourceRef ? openPost.id : undefined })
            if (sourceRef) addSourceCard(sourceRef, { id: openPost.id, url: openPost.url, title: openPost.title, addedAt: Date.now() })
          }
        }}
        onCreateSpaceForPost={(name) => {
          if (!openPost) return
          const id = createSpace(name)
          const sourceRef = openPost.sourceId !== 'manual' ? openPost.sourceId : undefined
          addPostToSpace(id, openPost, { sourceRef, cardRef: sourceRef ? openPost.id : undefined })
          if (sourceRef) addSourceCard(sourceRef, { id: openPost.id, url: openPost.url, title: openPost.title, addedAt: Date.now() })
        }}
        onCreateSpaceForNote={(name) => {
          return createSpace(name)
        }}
        onBack={handlePanelBack}
        onClose={handlePanelClose}
      />
    )}
    {sidebarSelectedSource && (
      <SourcePanel
        inline
        source={sidebarSelectedSource}
        categories={categories}
        industries={industries}
        allTags={allTags}
        sourceLists={sourceLists}
        onSetCategory={setCategory}
        onSetIndustry={setIndustry}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onToggleSourceInList={toggleSourceInList}
        onCreateSourceList={createSourceList}
        onPromoteTag={() => openSidebarSource(null)}
        onTagClick={(tag) => { openSidebarSource(null); setSidebarTagPanel(tag) }}
        onCreateCategory={createCategory}
        onCreateIndustry={createIndustry}
        onRenameSource={renameSource}
        onBack={handlePanelBack}
        onClose={() => { handlePanelClose() }}
        allFeedPosts={allPosts}
        savedLists={lists}
        isRead={isRead}
        onAddSourceCard={addSourceCard}
        onRemoveSourceCard={removeSourceCard}
        onNavigateToSpace={(spaceId) => {
          try { sessionStorage.setItem('pendingOpenSource', sidebarSelectedSourceId ?? '') } catch {}
          router.push(`/remix?space=${spaceId}`)
        }}
        onOpenPiece={(post) => openPostInline(post)}
        allLibrarySources={allSources}
        onAddAssociation={sidebarSelectedSourceId ? (targetId) => addAssociation(sidebarSelectedSourceId, targetId) : undefined}
        onRemoveAssociation={sidebarSelectedSourceId ? (targetId) => removeAssociation(sidebarSelectedSourceId, targetId) : undefined}
        onOpenAssociation={(src) => openSidebarSource(src.id)}
        allSpaces={spaces.filter(s => !s.deletedAt).map(s => ({ id: s.id, name: s.name }))}
        onSetSummary={setSummary}
        onAddPieceToSpace={(spaceId, card) => { const source = sidebarSelectedSource; if (!source) return; const post = { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: source.id, sourceName: source.name, sourceColor: source.color } as Post; addPostToSpace(spaceId, post, { sourceRef: source.id, cardRef: card.id }) }}
        onShowPieceOnAssociations={(card, targetSourceIds) => { const source = sidebarSelectedSource; if (!source) return; const base: SpaceItem = { id: card.id, type: 'post' as const, postData: { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: source.id, sourceName: source.name, sourceColor: source.color } as Post, copyGroupId: card.id, cardRef: card.id, sourceRef: source.id, addedAt: card.addedAt }; for (const sid of targetSourceIds) { appendSourceItem(sid, { ...base, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }); addSourceCard(sid, card) } }}
      />
    )}
    {sourcesCardsPanelSource && !sourcesCardsOpen && (
      <SourcePanel
        inline
        source={sourcesCardsPanelSource}
        categories={categories}
        industries={industries}
        allTags={allTags}
        sourceLists={sourceLists}
        onSetCategory={setCategory}
        onSetIndustry={setIndustry}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onToggleSourceInList={toggleSourceInList}
        onCreateSourceList={createSourceList}
        onPromoteTag={() => openSourcesCardsPanel(null)}
        onTagClick={(tag) => { openSourcesCardsPanel(null); setSidebarTagPanel(tag) }}
        onCreateCategory={createCategory}
        onCreateIndustry={createIndustry}
        onRenameSource={renameSource}
        onClose={() => openSourcesCardsPanel(null)}
        allFeedPosts={allPosts}
        savedLists={lists}
        isRead={isRead}
        onAddSourceCard={addSourceCard}
        onRemoveSourceCard={removeSourceCard}
        onNavigateToSpace={(spaceId) => {
          try { sessionStorage.setItem('pendingOpenSource', sourcesCardsPanelId ?? '') } catch {}
          router.push(`/remix?space=${spaceId}`)
        }}
        onOpenPiece={(post) => openPostInline(post)}
        allLibrarySources={allSources}
        onAddAssociation={sourcesCardsPanelId ? (targetId) => addAssociation(sourcesCardsPanelId, targetId) : undefined}
        onRemoveAssociation={sourcesCardsPanelId ? (targetId) => removeAssociation(sourcesCardsPanelId, targetId) : undefined}
        onOpenAssociation={(src) => openSourcesCardsPanel(src.id)}
        allSpaces={spaces.filter(s => !s.deletedAt).map(s => ({ id: s.id, name: s.name }))}
        onSetSummary={setSummary}
        onAddPieceToSpace={(spaceId, card) => { const source = sourcesCardsPanelSource; if (!source) return; const post = { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: source.id, sourceName: source.name, sourceColor: source.color } as Post; addPostToSpace(spaceId, post, { sourceRef: source.id, cardRef: card.id }) }}
        onShowPieceOnAssociations={(card, targetSourceIds) => { const source = sourcesCardsPanelSource; if (!source) return; const base: SpaceItem = { id: card.id, type: 'post' as const, postData: { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: source.id, sourceName: source.name, sourceColor: source.color } as Post, copyGroupId: card.id, cardRef: card.id, sourceRef: source.id, addedAt: card.addedAt }; for (const sid of targetSourceIds) { appendSourceItem(sid, { ...base, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }); addSourceCard(sid, card) } }}
      />
    )}
    </div>
    </>
  )
}
