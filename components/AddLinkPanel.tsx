'use client'

import { useState, useRef } from 'react'
import { X, Link, Loader2, Plus } from 'lucide-react'
import Image from 'next/image'
import type { Post } from '@/lib/types'

interface OGData {
  title?: string
  image?: string
  description?: string
  siteName?: string
  error?: string
}

interface Props {
  feedId: string
  onAdd: (post: Post) => void
  onClose: () => void
}

export function AddLinkPanel({ feedId, onAdd, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [og, setOG] = useState<OGData | null>(null)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFetch() {
    const trimmed = url.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setOG(null)

    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(trimmed)}`)
      const data: OGData = await res.json()
      setOG(data)
      setTitle(data.title ?? '')
    } catch {
      setOG({ error: 'Could not fetch that URL. Try another.' })
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    if (!og || og.error || !title.trim()) return

    const hostname = (() => {
      try { return new URL(url.trim()).hostname.replace(/^www\./, '') }
      catch { return 'link' }
    })()

    const post: Post = {
      id: `manual-${feedId}-${Date.now()}`,
      title: title.trim(),
      url: url.trim(),
      image: og.image,
      excerpt: og.description?.slice(0, 200),
      date: new Date().toISOString(),
      sourceId: 'manual',
      sourceName: og.siteName ?? hostname,
      sourceColor: '#71717a',
    }

    onAdd(post)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <div className="flex items-center gap-2">
            <Link size={14} className="text-black/40" />
            <span className="text-xs font-semibold uppercase tracking-widest text-black/40">Add a link</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* URL input */}
          <div className="space-y-2">
            <p className="text-sm text-black/50 leading-relaxed">
              Paste a link to any show, article, or page and we&apos;ll pull in the details automatically.
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => { setUrl(e.target.value); setOG(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFetch() }}
                placeholder="https://oroko.live/radio/…"
                autoFocus
                className="flex-1 text-sm border border-black/15 px-3 py-2 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
              />
              <button
                onClick={handleFetch}
                disabled={!url.trim() || loading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : 'Fetch'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {og && !og.error && (
            <div className="space-y-4">
              <div className="border border-black/10 overflow-hidden">
                {og.image && (
                  <div className="w-full bg-black/5">
                    <Image
                      src={og.image}
                      alt={title}
                      width={600}
                      height={300}
                      className="w-full h-48 object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="p-3 space-y-1.5">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30">
                    {og.siteName ?? new URL(url).hostname.replace(/^www\./, '')}
                  </p>
                  {og.description && (
                    <p className="text-xs text-black/40 leading-relaxed line-clamp-2">{og.description}</p>
                  )}
                </div>
              </div>

              {/* Editable title */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-black/30">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm font-display font-semibold border border-black/15 px-3 py-2 outline-none focus:border-black/40 transition-colors"
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={!title.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white text-sm font-medium hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                Add to feed
              </button>
            </div>
          )}

          {og?.error && (
            <p className="text-sm text-black/40">{og.error}</p>
          )}
        </div>
      </div>
    </>
  )
}
