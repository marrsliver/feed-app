'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ArrowUpRight, Pencil, Check, Trash2 } from 'lucide-react'
import { useComments } from '@/hooks/useComments'

interface SourceCard {
  id: string
  name: string
  url: string
  color: string
  kind: 'static' | 'user'
  inFeed?: boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function NoteRow({
  text,
  createdAt,
  onEdit,
  onDelete,
}: {
  text: string
  createdAt: number
  onEdit: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commit() {
    if (draft.trim()) onEdit(draft)
    else setDraft(text)
    setEditing(false)
  }

  return (
    <div className="group flex gap-3">
      <div className="flex-1 space-y-0.5">
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
              if (e.key === 'Escape') { setDraft(text); setEditing(false) }
            }}
            onBlur={commit}
            rows={2}
            className="w-full text-sm border border-black/20 px-2 py-1.5 resize-none outline-none focus:border-black/40 transition-colors"
          />
        ) : (
          <p className="text-sm text-black leading-relaxed">{text}</p>
        )}
        <p className="text-[9px] text-black/25 tracking-widest uppercase">
          {formatTime(createdAt)}
        </p>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {editing ? (
          <button onClick={commit} className="p-1 text-black/40 hover:text-black transition-colors" aria-label="Save">
            <Check size={12} />
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="p-1 text-black/20 hover:text-black/60 transition-colors" aria-label="Edit note">
            <Pencil size={12} />
          </button>
        )}
        <button onClick={onDelete} className="p-1 text-black/20 hover:text-black/60 transition-colors" aria-label="Delete note">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

interface Props {
  source: SourceCard
  onClose: () => void
}

export function SourcePanel({ source, onClose }: Props) {
  const { addComment, deleteComment, editComment, getComments } = useComments()
  const comments = getComments(source.id)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSubmit() {
    if (!draft.trim()) return
    addComment(source.id, draft)
    setDraft('')
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-full max-w-md z-[70] bg-white flex flex-col overflow-hidden">
        {/* Color bar */}
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: source.color }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40">
            {source.kind === 'static' ? 'Built-in source' : 'User-added source'}
          </span>
          <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-4">
            {/* Name */}
            <h2 className="font-display text-lg font-semibold text-black leading-snug">
              {source.name}
            </h2>

            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 border border-black/10 px-1.5 py-0.5">
                {source.kind === 'static' ? 'Built-in' : 'User added'}
              </span>
              {source.kind === 'user' && (
                <span className={`text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 border ${source.inFeed ? 'border-black/20 text-black/50' : 'border-black/10 text-black/25'}`}>
                  {source.inFeed ? 'In feed' : 'List only'}
                </span>
              )}
              {source.kind === 'static' && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 border border-black/20 text-black/50">
                  In feed
                </span>
              )}
            </div>

            {/* Open button */}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-medium hover:bg-black/80 transition-colors"
            >
              Visit source
              <ArrowUpRight size={13} />
            </a>
          </div>

          <div className="border-t border-black/10 mx-5" />

          {/* Notes */}
          <div className="px-5 py-5 space-y-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
              Notes {comments.length > 0 && `(${comments.length})`}
            </h3>

            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((c) => (
                  <NoteRow
                    key={c.id}
                    text={c.text}
                    createdAt={c.createdAt}
                    onEdit={(text) => editComment(source.id, c.id, text)}
                    onDelete={() => deleteComment(source.id, c.id)}
                  />
                ))}
              </div>
            )}

            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
                }}
                placeholder="Add a note…"
                rows={3}
                className="w-full text-sm border border-black/15 px-3 py-2.5 resize-none outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
              />
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-black/25">⌘ + Enter to save</span>
                <button
                  onClick={handleSubmit}
                  disabled={!draft.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
