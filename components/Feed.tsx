'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import Masonry from 'react-masonry-css'
import { Loader2, Plus, MoreHorizontal } from 'lucide-react'
import type { Post, Source, PostsApiResponse } from '@/lib/types'
import { PostCard } from './PostCard'
import { SourceFilter } from './SourceFilter'
import { SearchBar } from './SearchBar'
import { useSavedLists } from '@/hooks/useSavedLists'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface Props {
  sources: Source[]
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

function ListPillMenu({
  listId,
  name,
  onRename,
  onDelete,
}: {
  listId: string
  name: string
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(name)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed) onRename(listId, trimmed)
    setRenaming(false)
  }

  if (renaming) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitRename()
          if (e.key === 'Escape') { setDraft(name); setRenaming(false) }
        }}
        onBlur={commitRename}
        onClick={(e) => e.stopPropagation()}
        className="w-24 text-xs border border-indigo-400 rounded px-1.5 py-0.5 outline-none"
      />
    )
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p) }}
        className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-indigo-100 transition-opacity"
        aria-label="List options"
      >
        <MoreHorizontal size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded shadow-md text-xs py-1 min-w-[100px]">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); setRenaming(true) }}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
          >
            Rename
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(listId) }}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-red-500"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export function Feed({ sources }: Props) {
  const [activeSources, setActiveSources] = useState<Set<string>>(
    new Set(sources.map((s) => s.id))
  )
  const [query, setQuery] = useState('')
  const [view, setView] = useState<string>('all')
  const [creatingList, setCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const newListInputRef = useRef<HTMLInputElement>(null)
  const { lists, createList, deleteList, renameList } = useSavedLists()

  // Reset to 'all' if active list is deleted
  useEffect(() => {
    if (view !== 'all' && !lists.find((l) => l.id === view)) {
      setView('all')
    }
  }, [lists, view])

  useEffect(() => {
    if (creatingList) newListInputRef.current?.focus()
  }, [creatingList])

  const activeSourcesList = [...activeSources]

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ['posts', activeSourcesList.sort().join(','), query],
      queryFn: ({ pageParam }) =>
        fetchPosts(pageParam as number, activeSourcesList, query),
      initialPageParam: 1,
      getNextPageParam: (last) => last.nextPage ?? undefined,
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

  function commitNewList() {
    const trimmed = newListName.trim()
    if (trimmed) {
      const id = createList(trimmed)
      setView(id)
    }
    setNewListName('')
    setCreatingList(false)
  }

  const allPosts: Post[] = data?.pages.flatMap((p) => p.posts) ?? []

  const activeList = lists.find((l) => l.id === view)
  const displayPosts =
    view === 'all'
      ? allPosts
      : allPosts.filter((p) => activeList?.postIds.includes(p.id))

  const activeListName = activeList?.name ?? 'All'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm border-b border-gray-200 pb-3 pt-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>
        </div>

        {/* List pills row */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {/* All pill */}
          <button
            onClick={() => setView('all')}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              view === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>

          {/* Named list pills */}
          {lists.map((list) => (
            <div
              key={list.id}
              className={`group shrink-0 flex items-center gap-0.5 rounded-full text-xs font-medium transition-colors ${
                view === list.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <button
                onClick={() => setView(list.id)}
                className="pl-3 pr-1 py-1"
              >
                {list.name} ({list.postIds.length})
              </button>
              <ListPillMenu
                listId={list.id}
                name={list.name}
                onRename={renameList}
                onDelete={deleteList}
              />
              <span className="pr-1" />
            </div>
          ))}

          {/* New list inline input or + button */}
          {creatingList ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                ref={newListInputRef}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitNewList()
                  if (e.key === 'Escape') { setCreatingList(false); setNewListName('') }
                }}
                onBlur={commitNewList}
                placeholder="List name…"
                className="text-xs border border-indigo-400 rounded-full px-3 py-1 outline-none w-32"
              />
            </div>
          ) : (
            <button
              onClick={() => setCreatingList(true)}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
              aria-label="New list"
            >
              <Plus size={12} />
            </button>
          )}
        </div>

        <SourceFilter
          sources={sources}
          active={activeSources}
          onToggle={toggleSource}
        />
      </div>

      {/* Status */}
      {status === 'pending' && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-20 text-red-500 text-sm">
          Failed to load posts. Check your internet connection and try again.
        </div>
      )}

      {status === 'success' && displayPosts.length === 0 && (
        <div className="text-center py-20 text-gray-400 text-sm">
          {view === 'all'
            ? 'No posts found.'
            : `No posts saved to "${activeListName}" yet.`}
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
            <PostCard key={post.id} post={post} />
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
