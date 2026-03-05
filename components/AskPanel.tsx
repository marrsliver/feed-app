'use client'

import { useState } from 'react'
import { X, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import type { Post } from '@/lib/types'
import { PostPanel } from './PostPanel'

interface Suggestion {
  postId: string
  reason: string
}

interface SuggestResponse {
  message: string
  suggestions: Suggestion[]
  error?: string
}

interface Props {
  posts: Post[]
  onClose: () => void
}

export function AskPanel({ posts, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<SuggestResponse | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  async function handleAsk() {
    if (!query.trim() || loading) return
    setLoading(true)
    setResponse(null)

    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          posts: posts.map((p) => ({
            id: p.id,
            title: p.title,
            sourceName: p.sourceName,
            excerpt: p.excerpt,
            date: p.date,
          })),
        }),
      })
      const data: SuggestResponse = await res.json()
      setResponse(data)
    } catch {
      setResponse({ message: '', suggestions: [], error: 'Something went wrong. Try again.' })
    } finally {
      setLoading(false)
    }
  }

  const suggestedPosts = (response?.suggestions ?? [])
    .map((s) => ({ post: posts.find((p) => p.id === s.postId), reason: s.reason }))
    .filter((s): s is { post: Post; reason: string } => !!s.post)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-black/40" />
            <span className="text-xs font-semibold uppercase tracking-widest text-black/40">Ask for help</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Input */}
          <div className="space-y-2">
            <p className="text-sm text-black/50 leading-relaxed">
              Describe what you&apos;re looking for — a mood, a topic, a feeling — and I&apos;ll find something from your feed.
            </p>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk()
              }}
              placeholder="e.g. suggest an article that will make me feel hopeful"
              rows={3}
              className="w-full text-sm border border-black/15 px-3 py-2.5 resize-none outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-black/25">⌘ + Enter to ask</span>
              <button
                onClick={handleAsk}
                disabled={!query.trim() || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {loading ? 'Thinking…' : 'Ask'}
              </button>
            </div>
          </div>

          {/* Response */}
          {response && (
            <div className="space-y-4">
              {response.error ? (
                <p className="text-sm text-black/40">{response.error}</p>
              ) : (
                <>
                  {response.message && (
                    <p className="text-sm text-black/60 leading-relaxed italic">{response.message}</p>
                  )}

                  {suggestedPosts && suggestedPosts.length > 0 ? (
                    <div className="space-y-3">
                      {suggestedPosts.map(({ post, reason }) => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="w-full text-left p-3 border border-black/10 hover:border-black/30 transition-colors space-y-1 group"
                        >
                          <p className="font-display text-sm font-semibold text-black leading-snug group-hover:opacity-60 transition-opacity">
                            {post.title}
                          </p>
                          <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: post.sourceColor }}>
                            {post.sourceName}
                          </p>
                          <p className="text-xs text-black/40 leading-relaxed">{reason}</p>
                          <div className="flex items-center gap-1 text-[10px] text-black/30 pt-0.5">
                            <span>Open</span>
                            <ArrowRight size={10} />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-black/40">No strong matches found. Try rephrasing your request.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post panel on top if a suggestion is clicked */}
      {selectedPost && (
        <PostPanel post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  )
}
