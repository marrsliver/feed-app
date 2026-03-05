'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import type { Source, UserSource } from '@/lib/types'

interface Props {
  staticSources: Source[]
  userSources: UserSource[]
  onAddSource: (source: Omit<UserSource, 'color' | 'addedAt'>) => void
  onRemoveSource: (id: string) => void
  onClose: () => void
}

type DetectState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; feedUrl: string; title: string; siteUrl: string }
  | { status: 'error'; message: string }

export function SourcesSidebar({ staticSources, userSources, onAddSource, onRemoveSource, onClose }: Props) {
  const [inputUrl, setInputUrl] = useState('')
  const [detect, setDetect] = useState<DetectState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  async function handleDetect() {
    const url = inputUrl.trim()
    if (!url) return
    setDetect({ status: 'loading' })
    try {
      const res = await fetch(`/api/detect-feed?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        setDetect({ status: 'error', message: 'No RSS feed found. Try pasting the RSS URL directly.' })
      } else {
        setDetect({ status: 'found', feedUrl: data.feedUrl, title: data.title || new URL(url).hostname, siteUrl: url })
      }
    } catch {
      setDetect({ status: 'error', message: 'Something went wrong. Check the URL and try again.' })
    }
  }

  function handleConfirm() {
    if (detect.status !== 'found') return
    onAddSource({
      id: `user-${Date.now()}`,
      name: detect.title,
      url: detect.siteUrl,
      feedUrl: detect.feedUrl,
    })
    setInputUrl('')
    setDetect({ status: 'idle' })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel — slides from left */}
      <div className="fixed top-0 left-0 h-full w-80 z-50 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
          <h2 className="text-sm font-semibold text-black">Sources</h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
            <X size={16} />
          </button>
        </div>

        {/* Source list */}
        <div className="flex-1 overflow-y-auto">
          {/* Static sources */}
          {staticSources.length > 0 && (
            <div className="px-4 pt-4 pb-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30 mb-2">Built-in</p>
              <div className="space-y-1">
                {staticSources.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 py-1.5 group"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-sm text-black/70 group-hover:text-black transition-colors truncate">
                      {s.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* User-added sources */}
          {userSources.length > 0 && (
            <div className="px-4 pt-4 pb-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30 mb-2">Added by you</p>
              <div className="space-y-1">
                {userSources.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 py-1.5 group">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-black/70 group-hover:text-black transition-colors truncate"
                    >
                      {s.name}
                    </a>
                    <button
                      onClick={() => onRemoveSource(s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-black/20 hover:text-red-500 transition-all"
                      aria-label="Remove source"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add source */}
        <div className="px-4 py-4 border-t border-black/10 space-y-3">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30">Add a source</p>

          {detect.status === 'found' ? (
            <div className="space-y-2">
              <div className="px-3 py-2 bg-black/5 text-sm">
                <p className="font-medium text-black truncate">{detect.title}</p>
                <p className="text-[10px] text-black/40 truncate mt-0.5">{detect.feedUrl}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-1.5 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors"
                >
                  Add to feed
                </button>
                <button
                  onClick={() => setDetect({ status: 'idle' })}
                  className="px-3 py-1.5 text-xs font-medium border border-black/20 text-black/50 hover:text-black transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={inputUrl}
                  onChange={(e) => { setInputUrl(e.target.value); setDetect({ status: 'idle' }) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDetect() }}
                  placeholder="Paste a website or RSS URL…"
                  className="flex-1 text-xs border border-black/15 px-3 py-2 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                />
                <button
                  onClick={handleDetect}
                  disabled={!inputUrl.trim() || detect.status === 'loading'}
                  className="px-3 py-2 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30"
                >
                  {detect.status === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                </button>
              </div>
              {detect.status === 'error' && (
                <p className="text-[10px] text-red-500">{detect.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
