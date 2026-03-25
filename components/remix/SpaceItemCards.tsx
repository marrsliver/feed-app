'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, X, Database, Pencil } from 'lucide-react'
import { PostCard } from '@/components/PostCard'
import type { SpaceItem, SpaceItemVersion, Post, LibrarySource } from '@/lib/types'

// ── AttachedNoteRow — editable note inside a merged card ─────────────────────

export function AttachedNoteRow({ note, onRemove, onDelete, onUpdate }: {
  note: SpaceItem
  onRemove: () => void
  onDelete?: () => void
  onUpdate: (updates: Partial<SpaceItem>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.content ?? '')
  const [confirming, setConfirming] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) textareaRef.current?.focus() }, [editing])
  useEffect(() => { if (!editing) setDraft(note.content ?? '') }, [note.content, editing])

  function save() {
    const t = draft.trim()
    if (!t || t === note.content) { setEditing(false); return }
    const newVersion: SpaceItemVersion = { content: note.content ?? '', editedAt: Date.now() }
    onUpdate({ content: t, versions: [newVersion, ...(note.versions ?? [])] })
    setEditing(false)
  }

  return (
    <div className="border-t border-amber-200/60 px-4 py-3 bg-amber-50/50 group/note">
      <div className="flex items-start gap-2">
        <FileText size={11} className="text-amber-400/60 mt-0.5 shrink-0" />
        {editing ? (
          <div className="flex-1 space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
                if (e.key === 'Escape') { setDraft(note.content ?? ''); setEditing(false) }
              }}
              rows={3}
              className="w-full text-sm border border-amber-200 px-2 py-1.5 resize-none outline-none focus:border-amber-400 transition-colors bg-white/70 leading-relaxed"
            />
            <div className="flex gap-2">
              <button onClick={save} className="text-xs bg-black text-white px-3 py-1 hover:bg-black/80 transition-colors">Save</button>
              <button onClick={() => { setDraft(note.content ?? ''); setEditing(false) }} className="text-xs text-black/40 hover:text-black px-2 py-1 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-black/80 leading-relaxed flex-1 whitespace-pre-wrap cursor-text" onClick={() => setEditing(true)}>
            {note.content}
          </p>
        )}
        {!editing && (
          confirming ? (
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => { onRemove(); setConfirming(false) }} className="text-[10px] text-black/50 hover:text-black font-medium px-1 transition-colors">Remove</button>
              {onDelete && <button onClick={() => { onDelete(); setConfirming(false) }} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1 transition-colors">Delete</button>}
              <button onClick={() => setConfirming(false)} className="text-[10px] text-black/30 hover:text-black/60 px-0.5 transition-colors leading-none">×</button>
            </div>
          ) : (
            <div className="flex gap-0.5 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0">
              <button onClick={() => setEditing(true)} className="p-0.5 text-black/25 hover:text-black transition-colors"><Pencil size={11} /></button>
              <button onClick={() => setConfirming(true)} className="p-0.5 text-black/25 hover:text-black transition-colors"><X size={11} /></button>
            </div>
          )
        )}
      </div>
      <p className="text-[9px] text-black/25 mt-1.5 ml-[19px] uppercase tracking-widest">
        {new Date(note.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}

// ── MergedArticleNoteCard — article + attached notes in one box ───────────────

export function MergedArticleNoteCard({ item, attachedNotes, sources, onRemovePost, onDeletePost, onRemoveNote, onUpdateNote, onOpenPost, onOpenSource, onConnectToSource, onUnlinkSource }: {
  item: SpaceItem
  attachedNotes: SpaceItem[]
  sources: LibrarySource[]
  onRemovePost: () => void
  onDeletePost?: () => void
  onRemoveNote: (noteId: string) => void
  onUpdateNote: (noteId: string, updates: Partial<SpaceItem>) => void
  onOpenPost: (post: Post) => void
  onOpenSource: (s: LibrarySource) => void
  onConnectToSource: () => void
  onUnlinkSource?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const post = item.postData!

  const explicitSrc = item.sourceRef ? sources.find((s) => s.id === item.sourceRef) : null
  const derivedSrc = !item.sourceRef && post.sourceId && post.sourceId !== 'manual'
    ? (sources.find((s) => s.id === post.sourceId) ?? { id: post.sourceId, name: post.sourceName, color: post.sourceColor })
    : null
  const displaySrc = explicitSrc ?? derivedSrc

  return (
    <div className="group relative bg-white" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.07)' }}>
      {/* Remove post — top right */}
      <div className="absolute top-2 right-2 z-10">
        {confirming ? (
          <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 border border-black/10">
            <button onClick={() => { onRemovePost(); setConfirming(false) }} className="text-[10px] text-black/50 hover:text-black font-medium px-1 transition-colors">Remove</button>
            {onDeletePost && <button onClick={() => { onDeletePost(); setConfirming(false) }} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1 transition-colors">Delete</button>}
            <button onClick={() => setConfirming(false)} className="text-[10px] text-black/30 hover:text-black/60 px-0.5 transition-colors leading-none">×</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-0.5 text-black/30 hover:text-black">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Article */}
      <div className="p-4 cursor-pointer" onClick={() => onOpenPost(post)}>
        {post.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image} alt={post.title} className="w-full object-cover max-h-36 mb-3 -mx-0" />
        )}
        <h3 className="text-sm font-semibold text-black leading-snug pr-5">{post.title}</h3>
        {post.excerpt && (
          <p className="text-xs text-black/50 mt-1.5 leading-relaxed line-clamp-2">{post.excerpt}</p>
        )}
        <p className="text-[9px] text-black/30 mt-2 uppercase tracking-widest">
          {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Attached notes */}
      {attachedNotes.map((note) => (
        <AttachedNoteRow
          key={note.id}
          note={note}
          onRemove={() => onRemoveNote(note.id)}
          onUpdate={(updates) => onUpdateNote(note.id, updates)}
        />
      ))}

      {/* Footer: source link */}
      <div className="px-4 pb-3 pt-2 flex items-center gap-3">
        {displaySrc && (
          <span className="flex items-center gap-1">
            <button
              onClick={() => { const src = sources.find((s) => s.id === displaySrc.id); if (src) onOpenSource(src) }}
              className="flex items-center gap-1 text-[9px] text-black/50 hover:text-black transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: displaySrc.color }} />
              {displaySrc.name}
            </button>
            {onUnlinkSource && item.sourceRef && (
              <button onClick={onUnlinkSource} title="Unlink source" className="text-black/25 hover:text-black/60 transition-colors leading-none">×</button>
            )}
          </span>
        )}
        <button
          onClick={onConnectToSource}
          className="flex items-center gap-1 text-[9px] text-black/30 hover:text-black/60 transition-colors"
        >
          <Database size={9} />{displaySrc ? 'Change source' : 'Link to source'}
        </button>
      </div>
    </div>
  )
}

// ── TextItemCard — floating canvas text (no card border) ─────────────────────

export function TextItemCard({ item, onRemove, onUpdate, onActivate, onDeactivate }: {
  item: SpaceItem
  onRemove: () => void
  onUpdate: (updates: Partial<SpaceItem>) => void
  onActivate?: () => void
  onDeactivate?: () => void
}) {
  const [editing, setEditing] = useState(!item.content)
  const [draft, setDraft] = useState(item.content ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus()
      onActivate?.()
    }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    const t = draft.trim()
    if (!t) { onDeactivate?.(); onRemove(); return }
    if (t !== item.content) onUpdate({ content: t })
    setEditing(false)
    onDeactivate?.()
  }

  return (
    <div
      className="relative group/text px-1 py-2 min-h-[2rem]"
      onClick={(e) => e.stopPropagation()}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save() }
            if (e.key === 'Escape') {
              if (!draft.trim()) { onDeactivate?.(); onRemove(); return }
              setDraft(item.content ?? ''); setEditing(false); onDeactivate?.()
            }
          }}
          placeholder="Type here…"
          rows={3}
          className="w-full resize-none outline-none bg-transparent text-sm text-black/70 leading-relaxed placeholder:text-black/20"
        />
      ) : (
        <p
          className="text-sm text-black/70 leading-relaxed whitespace-pre-wrap cursor-text"
          onClick={(e) => { e.stopPropagation(); setEditing(true) }}
        >
          {item.content}
        </p>
      )}
      {!editing && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="absolute top-0 right-0 opacity-0 group-hover/text:opacity-100 transition-opacity text-black/20 hover:text-black/50 p-1"
          aria-label="Remove"
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}

// ── DividerItemCard — full-width separator with resize ────────────────────────

export function DividerItemCard({ item, onRemove, onUpdate }: {
  item: SpaceItem
  onRemove: () => void
  onUpdate: (updates: Partial<SpaceItem>) => void
}) {
  const height = item.itemHeight ?? 56
  const [isResizing, setIsResizing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = height
    setIsResizing(true)
    function onMove(ev: MouseEvent) {
      const newH = Math.max(28, startH + (ev.clientY - startY))
      onUpdate({ itemHeight: newH })
    }
    function onUp() {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className="relative group/divider flex flex-col items-center justify-center"
      style={{ minHeight: height }}
    >
      {/* Horizontal rule */}
      <div className="w-full flex items-center gap-3 px-2">
        <div className="flex-1 h-px bg-black/15" />
        {item.content && (
          <span className="text-[9px] uppercase tracking-widest text-black/30 font-medium shrink-0 select-none">{item.content}</span>
        )}
        <div className="flex-1 h-px bg-black/15" />
      </div>

      {/* Delete button — top right, 2-click confirm */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/divider:opacity-100 transition-opacity">
        {confirming ? (
          <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 border border-black/10">
            <button onClick={() => { onRemove(); setConfirming(false) }} className="text-[10px] text-black/50 hover:text-black font-medium px-1 transition-colors">Remove</button>
            <button onClick={() => setConfirming(false)} className="text-[10px] text-black/30 hover:text-black/60 px-0.5 transition-colors leading-none">×</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-black/25 hover:text-red-500 bg-white/70 rounded-sm p-0.5" aria-label="Remove divider">
            <X size={10} />
          </button>
        )}
      </div>

      {/* Resize handle — bottom center */}
      <div
        onMouseDown={handleResizeMouseDown}
        className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end justify-center pb-0.5 opacity-0 group-hover/divider:opacity-100 transition-opacity ${isResizing ? 'opacity-100' : ''}`}
        title="Drag to adjust spacing"
      >
        <div className="w-8 h-0.5 bg-black/20 rounded-full" />
      </div>
    </div>
  )
}

// ── PostItemWrapper — source link footer ────────────────────────────────────

export function PostItemWrapper({
  item,
  sources,
  onRemove,
  onDelete,
  onOpenSource,
  onAddNoteToSpace,
  onOpenPost,
  onConnectToSource,
  onUnlinkSource,
}: {
  item: SpaceItem
  sources: LibrarySource[]
  onRemove: () => void
  onDelete?: () => void
  onOpenSource: (s: LibrarySource) => void
  onAddNoteToSpace: (content: string) => void
  onOpenPost: (post: Post) => void
  onConnectToSource?: () => void
  onUnlinkSource?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const post = item.postData!

  // Resolve source: explicit item.sourceRef takes priority, then derive from post.sourceId
  const explicitSrc = item.sourceRef ? sources.find((s) => s.id === item.sourceRef) : null
  const derivedSrc = !item.sourceRef && post.sourceId && post.sourceId !== 'manual'
    ? (sources.find((s) => s.id === post.sourceId) ?? { id: post.sourceId, name: post.sourceName, color: post.sourceColor })
    : null
  const displaySrc = explicitSrc ?? derivedSrc

  return (
    <div className="group relative">
      {/* Remove from space — top-right */}
      <div className="absolute top-2 right-2 z-10">
        {confirming ? (
          <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 border border-black/10">
            <button onClick={() => { onRemove(); setConfirming(false) }} className="text-[10px] text-black/50 hover:text-black font-medium px-1 transition-colors">Remove</button>
            {onDelete && <button onClick={() => { onDelete(); setConfirming(false) }} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1 transition-colors">Delete</button>}
            <button onClick={() => setConfirming(false)} className="text-[10px] text-black/30 hover:text-black/60 px-0.5 transition-colors leading-none">×</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-0.5 text-black/30 hover:text-black">
            <X size={12} />
          </button>
        )}
      </div>

      <PostCard
        post={post}
        onOpenPost={onOpenPost}
        onOpenSource={(sourceId) => {
          const src = sources.find((s) => s.id === sourceId)
          if (src) onOpenSource(src)
        }}
        onAddNoteToSpace={onAddNoteToSpace}
      />
      <div className="px-4 pb-3 -mt-1 flex items-center gap-3">
        {displaySrc && (
          <span className="flex items-center gap-1">
            <button
              onClick={() => { const src = sources.find((s) => s.id === displaySrc.id); if (src) onOpenSource(src) }}
              className="flex items-center gap-1 text-[9px] text-black/50 hover:text-black transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: displaySrc.color }} />
              {displaySrc.name}
            </button>
            {/* Only show unlink (×) for explicitly-linked sources */}
            {onUnlinkSource && item.sourceRef && (
              <button
                onClick={onUnlinkSource}
                title="Unlink source"
                className="text-black/25 hover:text-black/60 transition-colors leading-none"
              >
                ×
              </button>
            )}
          </span>
        )}
        {onConnectToSource && (
          <button
            onClick={onConnectToSource}
            className="flex items-center gap-1 text-[9px] text-black/30 hover:text-black/60 transition-colors"
          >
            <Database size={9} />{displaySrc ? 'Change source' : 'Link to source'}
          </button>
        )}
      </div>
    </div>
  )
}
