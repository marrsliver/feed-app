'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Post } from '@/lib/types'
import { BookmarkButton } from './BookmarkButton'
import { PostPanel } from './PostPanel'

interface Props {
  post: Post
  feedId?: string
  isRead?: boolean
  onRead?: () => void
  onMove?: () => void
  onDelete?: () => void
  onOpenSource?: (sourceId: string) => void
  onAddNoteToSpace?: (content: string) => void
  onOpenPost?: (post: Post) => void
  onSavedToSpace?: (post: Post) => void
  savedInSpaces?: { id: string; name: string }[]
  onNavigateToSpace?: (spaceId: string) => void
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function PostCard({ post, feedId, isRead, onRead, onMove, onDelete, onOpenSource, onAddNoteToSpace, onOpenPost, onSavedToSpace, savedInSpaces, onNavigateToSpace }: Props) {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <>
      <div className="break-inside-avoid mb-4">
        <div
          onClick={() => onOpenPost ? onOpenPost(post) : setPanelOpen(true)}
          className="group block bg-white transition-all duration-300 cursor-pointer"
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.07)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(0,0,0,0.07)'
          }}
        >
          {/* Image */}
          {post.image && (
            <div className="relative w-full overflow-hidden bg-black/5">
              <Image
                src={post.image}
                alt={post.title}
                width={600}
                height={400}
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                unoptimized
              />
            </div>
          )}

          {/* Content */}
          <div className="p-4 space-y-2">
            {/* Source + bookmark */}
            <div className="flex items-center justify-between gap-2">
              {onOpenSource ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenSource(post.sourceId) }}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] hover:underline text-left"
                  style={{ color: post.sourceColor }}
                >
                  {post.sourceName}
                </button>
              ) : (
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: post.sourceColor }}
                >
                  {post.sourceName}
                </span>
              )}
              <BookmarkButton post={post} onAdded={onSavedToSpace} />
            </div>

            {/* Title */}
            <h2 className={`font-display text-sm font-semibold leading-snug line-clamp-3 transition-colors ${isRead ? 'text-black/45' : 'text-black'}`}>
              {post.title}
            </h2>

            {/* Excerpt */}
            {post.excerpt && (
              <p className={`text-xs leading-relaxed line-clamp-3 ${isRead ? 'text-black/30' : 'text-black/40'}`}>
                {post.excerpt}
              </p>
            )}

            {/* Date */}
            <p className="text-[9px] text-black/25 tracking-widest uppercase pt-0.5">
              {formatDate(post.date)}
            </p>

            {/* Saved in spaces */}
            {savedInSpaces && savedInSpaces.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-black/5 mt-1.5">
                {savedInSpaces.map((s) => (
                  <button
                    key={s.id}
                    onClick={(e) => { e.stopPropagation(); onNavigateToSpace?.(s.id) }}
                    className="text-[9px] text-black/40 hover:text-black/70 border border-black/12 hover:border-black/25 px-1.5 py-0.5 transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!onOpenPost && panelOpen && <PostPanel post={post} feedId={feedId} onRead={onRead} onMove={onMove} onDelete={onDelete} onOpenSource={onOpenSource} onAddNoteToSpace={onAddNoteToSpace} onClose={() => setPanelOpen(false)} />}
    </>
  )
}
