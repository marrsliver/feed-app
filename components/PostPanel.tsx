'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { X, ArrowUpRight, Trash2, Pencil, Check, ArrowLeftRight } from 'lucide-react'
import type { Post } from '@/lib/types'
import { useComments } from '@/hooks/useComments'
import { BookmarkButton } from './BookmarkButton'

interface Props {
  post: Post
  feedId?: string
  onMove?: () => void
  onDelete?: () => void
  onClose: () => void
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch { return dateStr }
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
    else setDraft(text) // revert if empty
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
          <button
            onClick={commit}
            className="p-1 text-black/40 hover:text-black transition-colors"
            aria-label="Save"
          >
            <Check size={12} />
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-black/20 hover:text-black/60 transition-colors"
            aria-label="Edit note"
          >
            <Pencil size={12} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1 text-black/20 hover:text-black/60 transition-colors"
          aria-label="Delete note"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

export function PostPanel({ post, feedId, onMove, onDelete, onClose }: Props) {
  const { addComment, deleteComment, editComment, getComments } = useComments()
  const isManual = post.sourceId === 'manual'
  const otherFeedLabel = feedId === 'research' ? 'Music Feed' : 'Research Feed'
  const comments = getComments(post.id)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSubmit() {
    if (!draft.trim()) return
    addComment(post.id, draft)
    setDraft('')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: post.sourceColor }}
          >
            {post.sourceName}
          </span>
          <div className="flex items-center gap-2">
            <BookmarkButton postId={post.id} />
            <button
              onClick={onClose}
              className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image */}
          {post.image && (
            <div className="w-full bg-black/5">
              <Image
                src={post.image}
                alt={post.title}
                width={800}
                height={500}
                className="w-full h-auto object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="px-5 py-5 space-y-4">
            {/* Title + date */}
            <div className="space-y-1.5">
              <h2 className="font-display text-lg font-semibold text-black leading-snug">
                {post.title}
              </h2>
              <p className="text-[10px] text-black/30 tracking-widest uppercase">
                {formatDate(post.date)}
              </p>
            </div>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-sm text-black/50 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Buttons row */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-medium hover:bg-black/80 transition-colors"
              >
                Open article
                <ArrowUpRight size={13} />
              </a>
              {isManual && feedId && (
                <button
                  onClick={() => { onMove?.(); onClose() }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-black/20 text-xs font-medium text-black/50 hover:border-black/50 hover:text-black transition-colors"
                >
                  <ArrowLeftRight size={13} />
                  Move to {otherFeedLabel}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { onDelete(); onClose() }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-black/20 text-xs font-medium text-black/50 hover:border-red-200 hover:text-red-600 hover:border-red-300 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete card
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-black/10 mx-5" />

          {/* Comments */}
          <div className="px-5 py-5 space-y-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
              Notes {comments.length > 0 && `(${comments.length})`}
            </h3>

            {/* Existing comments */}
            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((c) => (
                  <NoteRow
                    key={c.id}
                    text={c.text}
                    createdAt={c.createdAt}
                    onEdit={(text) => editComment(post.id, c.id, text)}
                    onDelete={() => deleteComment(post.id, c.id)}
                  />
                ))}
              </div>
            )}

            {/* New comment input */}
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
