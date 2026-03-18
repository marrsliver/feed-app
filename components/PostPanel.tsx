'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { X, ArrowUpRight, Trash2, Pencil, Check, ArrowLeftRight, Link2, FolderPlus, Database, ChevronRight, Plus, ChevronLeft } from 'lucide-react'
import type { Post } from '@/lib/types'
import { useComments } from '@/hooks/useComments'
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'
import { BookmarkButton } from './BookmarkButton'

interface Props {
  post: Post
  feedId?: string
  onRead?: () => void
  onMove?: () => void
  onDelete?: () => void
  onOpenSource?: (sourceId: string) => void
  onAddNoteToSpace?: (content: string) => void
  onAddNoteToSpaceId?: (content: string, spaceId: string) => void
  allSpaces?: { id: string; name: string }[]
  onConnectToSource?: () => void
  onNavigateToSpace?: (spaceId: string) => void
  onBack?: () => void
  onClose: () => void
  inline?: boolean
  onCreateSpace?: (name: string, noteContent: string) => void
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
  onAddToSpace,
}: {
  text: string
  createdAt: number
  onEdit: (text: string) => void
  onDelete: () => void
  onAddToSpace?: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const [confirmDel, setConfirmDel] = useState(false)
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
        {onAddToSpace && (
          <button
            onClick={() => onAddToSpace(text)}
            className="p-1 text-black/20 hover:text-black/60 transition-colors"
            aria-label="Add to space"
            title="Add to current space"
          >
            <FolderPlus size={12} />
          </button>
        )}
        {confirmDel ? (
          <>
            <button onClick={() => { onDelete(); setConfirmDel(false) }} className="p-1 text-red-400 hover:text-red-600 transition-colors text-[9px] font-medium" aria-label="Confirm delete">Yes</button>
            <button onClick={() => setConfirmDel(false)} className="p-1 text-black/30 hover:text-black transition-colors text-[9px]" aria-label="Cancel">No</button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="p-1 text-black/20 hover:text-black/60 transition-colors"
            aria-label="Delete note"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

export function PostPanel({ post, feedId, onRead, onMove, onDelete, onOpenSource, onAddNoteToSpace, onAddNoteToSpaceId, allSpaces, onConnectToSource, onNavigateToSpace, onBack, onClose, inline, onCreateSpace }: Props) {
  const { addComment, deleteComment, editComment, getComments } = useComments()
  const { getPostSpaces } = useKnowledgeGraph()
  const isManual = post.sourceId === 'manual'
  const otherFeedLabel = feedId === 'research' ? 'Music Feed' : 'Research Feed'
  const comments = getComments(post.id)
  const postSpaces = getPostSpaces(post.id)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [spacePickNote, setSpacePickNote] = useState<string | null>(null)
  const [newSpaceName, setNewSpaceName] = useState('')

  // Determine what "add to space" does for NoteRow — space picker if allSpaces provided, else direct
  const noteAddToSpace = allSpaces && onAddNoteToSpaceId
    ? (text: string) => setSpacePickNote(text)
    : onAddNoteToSpace
    ? (text: string) => onAddNoteToSpace(text)
    : undefined
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function copyUrl() {
    navigator.clipboard.writeText(post.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

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
      {/* Backdrop — only for fixed modal mode */}
      {!inline && (
        <div
          className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-[1px] animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={inline
        ? 'w-[28rem] shrink-0 flex flex-col overflow-hidden border border-black/10 bg-white animate-slide-right h-[calc(100vh-57px)] relative'
        : 'fixed top-0 right-0 h-full w-full max-w-md z-[90] bg-white flex flex-col overflow-hidden animate-slide-right relative'
      }>
        {/* Space picker overlay */}
        {spacePickNote !== null && allSpaces && (
          <div className="absolute inset-0 bg-white z-20 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
              <span className="text-sm font-semibold">Add note to space</span>
              <button onClick={() => setSpacePickNote(null)} className="text-black/30 hover:text-black p-0.5 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {allSpaces.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onAddNoteToSpaceId?.(spacePickNote, s.id); setSpacePickNote(null) }}
                  className="w-full text-left px-5 py-3 text-sm hover:bg-black/5 transition-colors flex items-center gap-2"
                >
                  <ChevronRight size={11} className="text-black/25" />
                  {s.name}
                </button>
              ))}
            </div>
            <div className="border-t border-black/10 px-3 py-2 flex gap-2 shrink-0">
              <input
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSpaceName.trim() && spacePickNote !== null) {
                    onCreateSpace?.(newSpaceName.trim(), spacePickNote)
                    setNewSpaceName('')
                    setSpacePickNote(null)
                  }
                }}
                placeholder="New space name…"
                className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
              />
              <button
                onClick={() => {
                  if (!newSpaceName.trim() || spacePickNote === null) return
                  onCreateSpace?.(newSpaceName.trim(), spacePickNote)
                  setNewSpaceName('')
                  setSpacePickNote(null)
                }}
                disabled={!newSpaceName.trim()}
                className="text-xs bg-black text-white px-2 py-1.5 hover:bg-black/80 transition-colors disabled:opacity-30 flex items-center"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <button onClick={() => (onBack ?? onClose)()} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black shrink-0"><ChevronLeft size={15} /></button>
          {onOpenSource && !isManual ? (
            <button
              onClick={() => onOpenSource(post.sourceId)}
              className="text-[9px] font-semibold uppercase tracking-[0.15em] hover:opacity-60 transition-opacity"
              style={{ color: post.sourceColor }}
            >
              {post.sourceName}
            </button>
          ) : (
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: post.sourceColor }}
            >
              {post.sourceName}
            </span>
          )}
          <div className="flex items-center gap-2">
            <BookmarkButton post={post} />
            <button
              onClick={onClose}
              className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
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

            {/* Space badges */}
            {postSpaces.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {postSpaces.map(({ space }) => (
                  <button
                    key={space.id}
                    onClick={() => onNavigateToSpace?.(space.id)}
                    className={`text-[9px] px-1.5 py-0.5 transition-colors border ${onNavigateToSpace ? 'text-black/40 bg-black/5 border-transparent hover:border-black/20 hover:text-black/70 cursor-pointer' : 'text-black/40 bg-black/5 border-transparent cursor-default'}`}
                    title={onNavigateToSpace ? `Open "${space.name}"` : undefined}
                  >
                    {space.name}
                  </button>
                ))}
              </div>
            )}

            {/* Buttons row */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onRead?.()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-medium hover:bg-black/80 transition-colors"
              >
                Open article
                <ArrowUpRight size={13} />
              </a>
              <button
                onClick={copyUrl}
                className="inline-flex items-center gap-2 px-4 py-2 border border-black/20 text-xs font-medium text-black/50 hover:border-black/50 hover:text-black transition-colors"
              >
                <Link2 size={13} />
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
              {isManual && feedId && (
                <button
                  onClick={() => { onMove?.(); onClose() }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-black/20 text-xs font-medium text-black/50 hover:border-black/50 hover:text-black transition-colors"
                >
                  <ArrowLeftRight size={13} />
                  Move to {otherFeedLabel}
                </button>
              )}
              {onConnectToSource && (
                <button
                  onClick={onConnectToSource}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-black/20 text-xs font-medium text-black/50 hover:border-black/50 hover:text-black transition-colors"
                >
                  <Database size={13} />
                  Link to source
                </button>
              )}
              {onDelete && !confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-black/20 text-xs font-medium text-black/50 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete card
                </button>
              )}
              {confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-black/50">Delete this card?</span>
                  <button
                    onClick={() => { onDelete?.(); onClose() }}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-xs font-medium border border-black/20 text-black/50 hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
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
                    onAddToSpace={noteAddToSpace}
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
