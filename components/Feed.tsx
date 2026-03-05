'use client'

import { useState, useCallback, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import Masonry from 'react-masonry-css'
import { Loader2, BookmarkCheck, BookmarkIcon, Sparkles, LinkIcon } from 'lucide-react'
import type { Post, Source, PostsApiResponse } from '@/lib/types'
import { PostCard } from './PostCard'
import { SourceFilter } from './SourceFilter'
import { SearchBar } from './SearchBar'
import { ListsSidebar } from './ListsSidebar'
import { AskPanel } from './AskPanel'
import { AddLinkPanel } from './AddLinkPanel'
import { useSavedLists } from '@/hooks/useSavedLists'
import { useManualPosts } from '@/hooks/useManualPosts'
import { useHiddenPosts } from '@/hooks/useHiddenPosts'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface Props {
  sources: Source[]
  feedId: string
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

export function Feed({ sources, feedId }: Props) {
  const [activeSources, setActiveSources] = useState<Set<string>>(
    new Set(sources.map((s) => s.id))
  )
  const [query, setQuery] = useState('')
  const [view, setView] = useState<string>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const { lists, createList, deleteList, renameList } = useSavedLists()
  const otherFeedId = feedId === 'research' ? 'music' : 'research'
  const { posts: manualPosts, addPost, movePost, removePost } = useManualPosts(feedId)
  const { hiddenIds, hidePost } = useHiddenPosts()

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
      enabled: sources.length > 0,
    })

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const sentinelRef = useInfiniteScroll(loadMore, hasNextPage && !isFetchingNextPage)

  const toggleSource = useCallback((id: string) => {
    setActiveSources((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const fetchedPosts: Post[] = data?.pages.flatMap((p) => p.posts) ?? []
  const allPosts: Post[] = [
    ...manualPosts,
    ...fetchedPosts.filter((p) => !manualPosts.some((m) => m.id === p.id)),
  ].filter((p) => !hiddenIds.includes(p.id))
  const activeList = lists.find((l) => l.id === view)
  const displayPosts =
    view === 'all'
      ? allPosts
      : allPosts.filter((p) => activeList?.postIds.includes(p.id))

  const isFiltering = view !== 'all'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-black/10 pb-3 pt-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>

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

        <SourceFilter
          sources={sources}
          active={activeSources}
          onToggle={toggleSource}
        />
      </div>

      {/* Add link panel */}
      {addLinkOpen && (
        <AddLinkPanel feedId={feedId} onAdd={addPost} onClose={() => setAddLinkOpen(false)} />
      )}

      {/* Ask panel */}
      {askOpen && (
        <AskPanel posts={allPosts} onClose={() => setAskOpen(false)} />
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
      {status === 'pending' && sources.length > 0 && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-20 text-red-500 text-sm">
          Failed to load posts. Check your internet connection and try again.
        </div>
      )}

      {(status === 'success' || sources.length === 0) && displayPosts.length === 0 && (
        <div className="text-center py-20 text-black/25 text-sm">
          {view !== 'all'
            ? `No posts saved to "${activeList?.name}" yet.`
            : sources.length === 0
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
              onMove={post.sourceId === 'manual' ? () => movePost(post.id, otherFeedId) : undefined}
              onDelete={() => post.sourceId === 'manual' ? removePost(post.id) : hidePost(post.id)}
            />
          ))}
        </Masonry>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading more indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-indigo-400" size={24} />
        </div>
      )}

      {/* End of feed */}
      {status === 'success' && !hasNextPage && displayPosts.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">You&apos;ve reached the end.</p>
      )}
    </div>
  )
}
