'use client'

import { useState } from 'react'
import { ArrowUpRight, Bookmark, Share, X } from 'lucide-react'
import type { Post } from '@/lib/types'
import { BottomSheet } from './BottomSheet'

interface Props {
  post: Post | null
  savedIn: { id: string; name: string }[]
  onClose: () => void
  onOpenArticle: (post: Post) => void
  onSave: (post: Post) => void
  onSkip?: (post: Post) => void
}

export function ReaderSheet({ post, savedIn, onClose, onOpenArticle, onSave, onSkip }: Props) {
  const [imgError, setImgError] = useState(false)
  if (!post) return null

  const date = new Date(post.date)
  const dateLabel = isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })

  async function share() {
    if (!post) return
    try {
      if (navigator.share) await navigator.share({ title: post.title, url: post.url })
      else await navigator.clipboard?.writeText(post.url)
    } catch { /* user cancelled */ }
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      size="full"
      title={
        <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: post.sourceColor }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: post.sourceColor }} />
          {post.sourceName}
        </span>
      }
      footer={
        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              onClick={() => onSkip(post)}
              aria-label="Not for me"
              className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full border border-black/10 text-black/60 active:bg-black/5"
            >
              <X size={20} />
            </button>
          )}
          <button
            onClick={() => onSave(post)}
            aria-label="Save to a space"
            className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full border border-black/10 active:bg-black/5"
          >
            <Bookmark size={20} className={savedIn.length ? 'fill-black' : 'text-black/60'} />
          </button>
          <button
            onClick={() => onOpenArticle(post)}
            className="h-12 flex-1 flex items-center justify-center gap-2 rounded-full bg-black text-white text-[15px] font-semibold active:bg-black/80"
          >
            Read article <ArrowUpRight size={18} />
          </button>
        </div>
      }
    >
      <div className="pb-8">
        {post.image && !imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image}
            alt=""
            onError={() => setImgError(true)}
            className="w-full max-h-[45dvh] object-cover bg-black/5"
          />
        )}
        <div className="px-5 pt-5 space-y-4">
          <h1 className="font-display text-[28px] leading-[1.12] font-semibold tracking-tight">{post.title}</h1>
          <div className="flex items-center justify-between gap-3 text-[13px] text-black/40">
            <span>{dateLabel}</span>
            <button onClick={share} className="flex items-center gap-1.5 -mr-1 px-2 py-1.5 rounded-full active:bg-black/5 text-black/55">
              <Share size={15} /> Share
            </button>
          </div>
          {post.excerpt && (
            <p className="text-[17px] leading-[1.6] text-black/75">{post.excerpt.replace(/\s+/g, ' ').trim()}</p>
          )}
          {savedIn.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[12px] text-black/40">Saved in</span>
              {savedIn.map((s) => (
                <span key={s.id} className="rounded-full bg-black/5 px-2.5 py-1 text-[12px] font-medium text-black/70">{s.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
