'use client'

import { useState, useMemo } from 'react'
import Masonry from 'react-masonry-css'
import { X, Layers, Loader2, LinkIcon, BookmarkIcon, BookmarkCheck, Search } from 'lucide-react'
import { Header } from '@/components/Header'
import { PostCard } from '@/components/PostCard'
import { ListsSidebar } from '@/components/ListsSidebar'
import { AddLinkPanel } from '@/components/AddLinkPanel'
import { useSavedLists } from '@/hooks/useSavedLists'
import { useManualPosts } from '@/hooks/useManualPosts'
import type { SavedList, Post } from '@/lib/types'

const BREAKPOINTS = { default: 4, 1280: 3, 1024: 3, 768: 2, 640: 1 }

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function ListCard({ list, onClick }: { list: SavedList; onClick: () => void }) {
  const count = list.postIds.length
  return (
    <div className="break-inside-avoid mb-4">
      <div
        onClick={onClick}
        className="bg-white cursor-pointer transition-all duration-300 overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.07)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(0,0,0,0.07)'
        }}
      >
        <div className="h-1.5 w-full bg-black" />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <Layers size={13} className="text-black/25 mt-0.5 shrink-0" />
            <h2 className="font-display text-sm font-semibold text-black leading-snug flex-1">{list.name}</h2>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 border border-black/10 px-1.5 py-0.5">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
            <span className="text-[9px] text-black/25 tracking-widest uppercase">
              {formatDate(list.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListDetailPanel({ list, onClose }: { list: SavedList; onClose: () => void }) {
  const posts: Post[] = Object.values(list.postData ?? {})
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl z-[70] bg-white flex flex-col overflow-hidden">
        <div className="h-1.5 w-full bg-black shrink-0" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30">List</p>
            <h2 className="font-display text-base font-semibold text-black">{list.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-black/25 text-sm">
              <p>No posts saved to this list yet.</p>
              <p className="text-[10px] mt-2">Bookmark posts from the Research feed to add them here.</p>
            </div>
          ) : (
            <Masonry
              breakpointCols={{ default: 2, 768: 1 }}
              className="flex -ml-4 w-auto"
              columnClassName="pl-4 bg-clip-padding"
            >
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </Masonry>
          )}
        </div>
      </div>
    </>
  )
}

export default function RemixPage() {
  const { lists, loaded, refetch, createList, deleteList, renameList } = useSavedLists()
  const { posts: manualPosts, addPost } = useManualPosts('remix')
  const [selectedList, setSelectedList] = useState<SavedList | null>(null)
  const [listsOpen, setListsOpen] = useState(false)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Force refetch on mount to fix Next.js router cache issue
  // (refetch is stable, so this only runs once)

  const filteredLists = useMemo(() => {
    if (!query.trim()) return lists
    const q = query.toLowerCase()
    return lists.filter((l) => l.name.toLowerCase().includes(q))
  }, [lists, query])

  const filteredPosts = useMemo(() => {
    if (!query.trim()) return manualPosts
    const q = query.toLowerCase()
    return manualPosts.filter((p) => p.title.toLowerCase().includes(q))
  }, [manualPosts, query])

  const isEmpty = filteredLists.length === 0 && filteredPosts.length === 0

  return (
    <main className="min-h-screen">
      <Header activeFeed="remix" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-black/10 pb-3 pt-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lists and posts…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-black/10 bg-white outline-none focus:border-black/30 transition-colors placeholder:text-black/25"
              />
            </div>

            {/* Add link */}
            <button
              onClick={() => setAddLinkOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
            >
              <LinkIcon size={13} />
              Add
            </button>

            {/* Lists management */}
            {lists.length > 0 ? (
              <button
                onClick={() => setListsOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
              >
                <BookmarkIcon size={13} />
                Lists
              </button>
            ) : (
              <button
                onClick={() => setListsOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
              >
                <BookmarkIcon size={13} />
                Lists
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {!loaded ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-black/20" size={28} />
          </div>
        ) : isEmpty ? (
          <div className="text-center py-20 text-black/25 text-sm">
            {query ? (
              <p>No results for &ldquo;{query}&rdquo;.</p>
            ) : (
              <>
                <p>Nothing here yet.</p>
                <p className="text-[10px] mt-2">Save posts to lists from the Research feed, or use Add to add links here.</p>
              </>
            )}
          </div>
        ) : (
          <Masonry
            breakpointCols={BREAKPOINTS}
            className="flex -ml-4 w-auto"
            columnClassName="pl-4 bg-clip-padding"
          >
            {filteredLists.map((list) => (
              <ListCard key={list.id} list={list} onClick={() => setSelectedList(list)} />
            ))}
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} feedId="remix" />
            ))}
          </Masonry>
        )}
      </div>

      {selectedList && (
        <ListDetailPanel list={selectedList} onClose={() => setSelectedList(null)} />
      )}

      {listsOpen && (
        <ListsSidebar
          lists={lists}
          view=""
          onSetView={() => {}}
          onClose={() => setListsOpen(false)}
          onCreate={createList}
          onRename={renameList}
          onDelete={deleteList}
        />
      )}

      {addLinkOpen && (
        <AddLinkPanel feedId="remix" onAdd={addPost} onClose={() => setAddLinkOpen(false)} />
      )}
    </main>
  )
}
