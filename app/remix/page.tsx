'use client'

import { useState } from 'react'
import Masonry from 'react-masonry-css'
import { X, Layers } from 'lucide-react'
import { Header } from '@/components/Header'
import { PostCard } from '@/components/PostCard'
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
  const { lists } = useSavedLists()
  const { posts: manualPosts } = useManualPosts('remix')
  const [selectedList, setSelectedList] = useState<SavedList | null>(null)

  const isEmpty = lists.length === 0 && manualPosts.length === 0

  return (
    <main className="min-h-screen">
      <Header activeFeed="remix" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isEmpty ? (
          <div className="text-center py-20 text-black/25 text-sm">
            <p>Nothing here yet.</p>
            <p className="text-[10px] mt-2">Save posts to lists from the Research feed to see them here.</p>
          </div>
        ) : (
          <Masonry
            breakpointCols={BREAKPOINTS}
            className="flex -ml-4 w-auto"
            columnClassName="pl-4 bg-clip-padding"
          >
            {lists.map((list) => (
              <ListCard key={list.id} list={list} onClick={() => setSelectedList(list)} />
            ))}
            {manualPosts.map((post) => (
              <PostCard key={post.id} post={post} feedId="remix" />
            ))}
          </Masonry>
        )}
      </div>

      {selectedList && (
        <ListDetailPanel list={selectedList} onClose={() => setSelectedList(null)} />
      )}
    </main>
  )
}
