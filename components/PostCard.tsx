'use client'

import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import type { Post } from '@/lib/types'
import { BookmarkButton } from './BookmarkButton'

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
  return (
    <div className="break-inside-avoid mb-4">
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
      >
        {/* Image */}
        {post.image && (
          <div className="relative w-full overflow-hidden bg-gray-100">
            <Image
              src={post.image}
              alt={post.title}
              width={600}
              height={400}
              className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
              unoptimized
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Source badge + bookmark */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: post.sourceColor }}
            >
              {post.sourceName}
            </span>
            <BookmarkButton postId={post.id} />
          </div>

          {/* Title */}
          <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 group-hover:text-indigo-700 transition-colors">
            {post.title}
          </h2>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
              {post.excerpt}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">{formatDate(post.date)}</span>
            <ExternalLink size={12} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>
      </a>
    </div>
  )
}
