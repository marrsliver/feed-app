'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Post } from '@/lib/types'
import { BookmarkButton } from './BookmarkButton'
import { PostPanel } from './PostPanel'

interface Props {
  post: Post
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

export function PostCard({ post }: Props) {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <>
      <div className="break-inside-avoid mb-4">
        <div
          onClick={() => setPanelOpen(true)}
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
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.15em] px-1.5 py-0.5"
                style={{ color: post.sourceColor }}
              >
                {post.sourceName}
              </span>
              <BookmarkButton postId={post.id} />
            </div>

            {/* Title */}
            <h2 className="font-display text-sm font-semibold text-black leading-snug line-clamp-3 group-hover:opacity-60 transition-opacity duration-200">
              {post.title}
            </h2>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xs text-black/40 leading-relaxed line-clamp-3">
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

      {panelOpen && <PostPanel post={post} onClose={() => setPanelOpen(false)} />}
    </>
  )
}
