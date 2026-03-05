'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, Rss, BookOpen } from 'lucide-react'
import type { Source, UserSource } from '@/lib/types'

interface Props {
  staticSources: Source[]
  userSources: UserSource[]
  onAddSource: (source: Omit<UserSource, 'color' | 'addedAt'>) => void
  onRemoveSource: (id: string) => void
  onToggleFeed: (id: string) => void
  onClose: () => void
}

type DetectState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; feedUrl: string; title: string; siteUrl: string }
  | { status: 'error'; message: string }

type SortView = 'all' | 'feed' | 'list'

export function SourcesSidebar({ staticSources, userSources, onAddSource, onRemoveSource, onToggleFeed, onClose }: Props) {
  const [inputUrl, setInputUrl] = useState('')
  const [detect, setDetect] = useState<DetectState>({ status: 'idle' })
  const [sortView, setSortView] = useState<SortView>('all')
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

  function handleAdd(inFeed: boolean) {
    if (detect.status !== 'found') return
    onAddSource({
      id: `user-${Date.now()}`,
      name: detect.title,
      url: detect.siteUrl,
      feedUrl: detect.feedUrl,
      inFeed,
    })
    setInputUrl('')
    setDetect({ status: 'idle' })
  }

  const filteredUserSources = userSources.filter((s) => {
    if (sortView === 'feed') return s.inFeed
    if (sortView === 'list') return !s.inFeed
    return true
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed top-0 left-0 h-full w-80 z-50 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
          <h2 className="text-sm font-semibold text-black">Sources</h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
            <X size={16} />
          </button>
        </div>

        {/* Sort tabs — only shown when there are user sources */}
        {userSources.length > 0 && (
          <div className="flex border-b border-black/10 shrink-0">
            {(['all', 'feed', 'list'] as SortView[]).map((tab) => {
              const label = tab === 'all' ? 'All' : tab === 'feed' ? 'In feed' : 'List only'
              return (
                <button
                  key={tab}
                  onClick={() => setSortView(tab)}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                    sortView === tab ? 'text-black border-b-2 border-black -mb-px' : 'text-black/30 hover:text-black'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Source list */}
        <div className="flex-1 overflow-y-auto">
          {/* Static sources — only shown in All view */}
          {sortView === 'all' && staticSources.length > 0 && (
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
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-black/70 group-hover:text-black transition-colors truncate">{s.name}</span>
                    <Rss size={10} className="shrink-0 text-black/20 ml-auto" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* User-added sources */}
          {filteredUserSources.length > 0 && (
            <div className="px-4 pt-4 pb-2">
              {sortView === 'all' && <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30 mb-2">Added by you</p>}
              <div className="space-y-1">
                {filteredUserSources.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 py-1.5 group">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-black/70 group-hover:text-black transition-colors truncate"
                    >
                      {s.name}
                    </a>
                    {/* In-feed toggle */}
                    <button
                      onClick={() => onToggleFeed(s.id)}
                      title={s.inFeed ? 'In feed — click to move to list only' : 'List only — click to add to feed'}
                      className={`shrink-0 p-1 transition-colors ${s.inFeed ? 'text-black/50 hover:text-black' : 'text-black/15 hover:text-black/40'}`}
                    >
                      {s.inFeed ? <Rss size={11} /> : <BookOpen size={11} />}
                    </button>
                    <button
                      onClick={() => onRemoveSource(s.id)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-black/20 hover:text-red-500 transition-all"
                      aria-label="Remove source"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredUserSources.length === 0 && userSources.length > 0 && (
            <p className="text-center py-10 text-black/25 text-xs">
              {sortView === 'feed' ? 'No sources in feed yet.' : 'No list-only sources yet.'}
            </p>
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
              <p className="text-[10px] text-black/40">How would you like to add this?</p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleAdd(true)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors"
                >
                  <Rss size={11} />
                  Add to feed
                </button>
                <button
                  onClick={() => handleAdd(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-black/20 text-black/60 hover:text-black hover:border-black/40 transition-colors"
                >
                  <BookOpen size={11} />
                  Save to list only
                </button>
                <button
                  onClick={() => setDetect({ status: 'idle' })}
                  className="text-xs text-black/30 hover:text-black transition-colors text-center py-1"
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
