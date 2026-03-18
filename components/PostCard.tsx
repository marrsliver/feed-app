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

export function PostCard({ post, feedId, isRead, onRead, onMove, onDelete, onOpenSource, onAddNoteToSpace, onOpenPost }: Props) {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <>
      <div className="break-inside-avoid mb-4">
        <div
          onClick={() => onOpenPost ? onOpenPost(post) : setPanelOpen(true)}
          className="group block bg-white overflow-hidden transition-all duration-300 cursor-pointer"
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
              <BookmarkButton post={post} />
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
          </div>
        </div>
      </div>

      {!onOpenPost && panelOpen && <PostPanel post={post} feedId={feedId} onRead={onRead} onMove={onMove} onDelete={onDelete} onOpenSource={onOpenSource} onAddNoteToSpace={onAddNoteToSpace} onClose={() => setPanelOpen(false)} />}
    </>
  )
}
