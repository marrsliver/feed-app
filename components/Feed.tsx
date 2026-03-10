'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useInfiniteQuery, useQueries } from '@tanstack/react-query'
import Masonry from 'react-masonry-css'
import { Loader2, BookmarkCheck, BookmarkIcon, Sparkles, LinkIcon, Archive, Rss } from 'lucide-react'
import type { LibrarySource, PostsApiResponse, Post } from '@/lib/types'
import { rankPosts } from '@/lib/rankPosts'
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
import { TagSourcesPanel } from './TagSourcesPanel'
import { useSavedLists } from '@/hooks/useSavedLists'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useSourceLists } from '@/hooks/useSourceLists'
import { useSourceCategories } from '@/hooks/useSourceCategories'
import { useManualPosts } from '@/hooks/useManualPosts'
import { useDeletedPosts } from '@/hooks/useDeletedPosts'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useReadPosts } from '@/hooks/useReadPosts'

interface Props {
  feedId: string
  showSources?: boolean
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

export function Feed({ feedId, showSources }: Props) {
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [view, setView] = useState<string>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [sourcesCardsOpen, setSourcesCardsOpen] = useState(false)
  const [sidebarSelectedSource, setSidebarSelectedSource] = useState<LibrarySource | null>(null)
  const [sidebarTagPanel, setSidebarTagPanel] = useState<string | null>(null)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const { isRead, markRead } = useReadPosts()

  const {
    sources: allSources,
    staticSources,
    userSources,
    allTags,
    loaded: sourcesLoaded,
    addSource,
    removeSource,
    toggleFeed,
    setCategory,
    addTag,
    removeTag,
  } = useLibrarySources()

  const { sourceLists, createSourceList, deleteSourceList, renameSourceList, toggleSourceInList } = useSourceLists()
  const { categories, createCategory } = useSourceCategories()
  const { lists, createList, deleteList, renameList } = useSavedLists()
  const otherFeedId = feedId === 'research' ? 'music' : 'research'
  const { posts: manualPosts, addPost, movePost, removePost } = useManualPosts(feedId)
  const { deletedPosts, hiddenIds, archivePost, restorePost } = useDeletedPosts()

  // Static sources for this feed group
  const feedStaticSources = useMemo(
    () => staticSources.filter((s) => s.feedGroup === feedId),
    [staticSources, feedId]
  )

  // User sources in the feed (non-static, inFeed=true)
  const feedUserSources = useMemo(() => userSources.filter((s) => s.inFeed), [userSources])

  const allSourceIds = useMemo(
    () => [...feedStaticSources.map((s) => s.id), ...feedUserSources.map((s) => s.id)],
    [feedStaticSources, feedUserSources]
  )

  // Populate activeSources when library loads
  useEffect(() => {
    if (!sourcesLoaded) return
    setActiveSources((prev) => {
      if (prev.size > 0) {
        // Add any newly-added sources
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
      // If all are active, first click spotlights just this source
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

  const fetchedPosts: Post[] = data?.pages.flatMap((p) => p.posts) ?? []
  const seenIds = new Set<string>()
  const filtered = [...manualPosts, ...fetchedPosts, ...accumulatedUserPosts]
    .filter((p) => { if (seenIds.has(p.id)) return false; seenIds.add(p.id); return true })
    .filter((p) => !hiddenIds.includes(p.id))
    .filter((p) => p.sourceId === 'manual' || activeSources.has(p.sourceId))
  const allPosts = rankPosts(filtered)
  const activeList = lists.find((l) => l.id === view)
  const listFiltered =
    view === 'all'
      ? allPosts
      : allPosts.filter((p) => activeList?.postIds.includes(p.id))
  const displayPosts = showUnreadOnly
    ? listFiltered.filter((p) => !isRead(p.id))
    : listFiltered

  const isFiltering = view !== 'all'
  const unreadCount = allPosts.filter((p) => !isRead(p.id)).length

  // Sources for the filter bar (static + user in-feed for this feedId)
  const filterSources = useMemo(() => [
    ...feedStaticSources.map((s) => ({ id: s.id, name: s.name, url: s.url, type: s.type, color: s.color, feedUrl: s.feedUrl })),
    ...feedUserSources.map((s) => ({ id: s.id, name: s.name, url: s.url, type: s.type, color: s.color, feedUrl: s.feedUrl })),
  ], [feedStaticSources, feedUserSources])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-black/10 pb-3 pt-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>

          {/* Sources button — research feed only */}
          {showSources && (
            <button
              onClick={() => setSourcesOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
            >
              <Rss size={13} />
              Sources
            </button>
          )}

          {/* Add link button */}
          <button
            onClick={() => setAddLinkOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
          >
            <LinkIcon size={13} />
            Add
          </button>

          {/* Ask for help button */}
          <button
            onClick={() => setAskOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
          >
            <Sparkles size={13} />
            Ask
          </button>

          {/* Archive button */}
          {deletedPosts.length > 0 && (
            <button
              onClick={() => setArchiveOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
            >
              <Archive size={13} />
              Archive ({deletedPosts.length})
            </button>
          )}

          {/* Unread filter toggle */}
          <button
            onClick={() => setShowUnreadOnly((v) => !v)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors ${
              showUnreadOnly
                ? 'bg-black text-white border-black'
                : 'border-black/15 text-black/50 hover:border-black/40 hover:text-black'
            }`}
          >
            Unread{!showUnreadOnly && unreadCount > 0 && (
              <span className="text-[9px] font-semibold">{unreadCount}</span>
            )}
          </button>

          {/* Lists button / active filter chip */}
          {isFiltering ? (
            <div className="shrink-0 flex items-center border border-black bg-black text-white text-xs font-medium overflow-hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 hover:bg-black/80 transition-colors"
              >
                <BookmarkCheck size={13} />
                {activeList?.name}
              </button>
              <button
                onClick={() => setView('all')}
                aria-label="Clear filter"
                className="pr-2.5 pl-1 py-1.5 hover:bg-black/80 transition-colors text-white/50 hover:text-white"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
            >
              <BookmarkIcon size={13} />
              Lists
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <SourceFilter
            sources={filterSources}
            active={activeSources}
            onToggle={toggleSource}
            onReset={() => setActiveSources(new Set(allSourceIds))}
          />
        </div>
      </div>

      {/* Sources sidebar */}
      {sourcesOpen && (
        <SourcesSidebar
          feedId={feedId}
          staticSources={feedStaticSources}
          userSources={userSources}
          categories={categories}
          onAddSource={addSource}
          onRemoveSource={removeSource}
          onToggleFeed={toggleFeed}
          onOpenSource={(id) => {
            const source = [...staticSources, ...userSources].find((s) => s.id === id)
            if (source) setSidebarSelectedSource(source)
            // Don't close sidebar - keep it open
          }}
          onClose={() => setSourcesOpen(false)}
          onShowCards={() => { setSourcesOpen(false); setSourcesCardsOpen(true) }}
          elevated={sourcesCardsOpen}
        />
      )}

      {/* Sources cards view */}
      {sourcesCardsOpen && (
        <SourcesCardsView
          sources={allSources}
          categories={categories}
          allTags={allTags}
          sourceLists={sourceLists}
          onSetCategory={setCategory}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onToggleSourceInList={toggleSourceInList}
          onCreateSourceList={createSourceList}
          onCreateCategory={createCategory}
          onShowLibrary={() => { setSourcesOpen(true) }}
          onClose={() => setSourcesCardsOpen(false)}
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

      {/* SourcePanel opened from sources sidebar */}
      {sidebarSelectedSource && (
        <SourcePanel
          source={sidebarSelectedSource}
          categories={categories}
          allTags={allTags}
          sourceLists={sourceLists}
          onSetCategory={setCategory}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onToggleSourceInList={toggleSourceInList}
          onCreateSourceList={createSourceList}
          onPromoteTag={(tag) => { setSidebarSelectedSource(null); /* promotion not supported from sidebar context */ }}
          onTagClick={(tag) => { setSidebarSelectedSource(null); setSidebarTagPanel(tag) }}
          onCreateCategory={createCategory}
          onClose={() => setSidebarSelectedSource(null)}
        />
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

      {/* Status */}
      {status === 'pending' && feedStaticSources.length > 0 && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-black/20" size={32} />
        </div>
      )}

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
  )
}
