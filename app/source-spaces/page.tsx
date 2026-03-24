'use client'

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Search, ChevronRight, ChevronDown, FolderOpen, Folder, Info, Layers,
  FileText, Link2, Database, Image as ImageIcon, Minus, GripVertical,
  X, GitBranch, ExternalLink,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { NoteItemCard } from '@/components/NoteItemCard'
import { SourceItemCard } from '@/components/SourceItemCard'
import { NestedSpaceCard } from '@/components/NestedSpaceCard'
import { MediaItemCard } from '@/components/MediaItemCard'
import { PostCard } from '@/components/PostCard'
import { SourcePanel } from '@/components/SourcePanel'
import { AddLinkPanel } from '@/components/AddLinkPanel'
import { SourcePickerModal } from '@/components/SourcePickerModal'
import { PostPanel } from '@/components/PostPanel'
import { useSourceItems } from '@/hooks/useSourceItems'
import { useSpaces } from '@/hooks/useSpaces'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useSourceCategories } from '@/hooks/useSourceCategories'
import { useSourceIndustries } from '@/hooks/useSourceIndustries'
import { useComments } from '@/hooks/useComments'
import { pushUndo } from '@/lib/undoStack'
import type { SpaceItem, SpaceItemVersion, LibrarySource, Post, Space } from '@/lib/types'

// ── Session storage helpers for sidebar state ────────────────────────────────

const SS_INDUSTRIES_KEY = 'source-spaces-expanded-industries'
const SS_CATEGORIES_KEY = 'source-spaces-expanded-categories'

function readSSSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(sessionStorage.getItem(key) ?? '[]') as string[]) } catch { return new Set() }
}

function writeSSSet(key: string, s: Set<string>) {
  try { sessionStorage.setItem(key, JSON.stringify([...s])) } catch { /* ignore */ }
}

// ── TextItemCard (local copy) ────────────────────────────────────────────────

function TextItemCard({ item, onRemove, onUpdate, onActivate, onDeactivate }: {
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
    if (editing) { textareaRef.current?.focus(); onActivate?.() }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    const t = draft.trim()
    if (!t) { onDeactivate?.(); onRemove(); return }
    if (t !== item.content) onUpdate({ content: t })
    setEditing(false)
    onDeactivate?.()
  }

  return (
    <div className="relative group/text px-1 py-2 min-h-[2rem]" onClick={(e) => e.stopPropagation()}>
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
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}

// ── DividerItemCard (local copy) ─────────────────────────────────────────────

function DividerItemCard({ item, onRemove, onUpdate }: {
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
    function onMove(ev: MouseEvent) { onUpdate({ itemHeight: Math.max(28, startH + (ev.clientY - startY)) }) }
    function onUp() { setIsResizing(false); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="relative group/divider flex flex-col items-center justify-center" style={{ minHeight: height }}>
      <div className="w-full flex items-center gap-3 px-2">
        <div className="flex-1 h-px bg-black/15" />
        {item.content && <span className="text-[9px] uppercase tracking-widest text-black/30 font-medium shrink-0 select-none">{item.content}</span>}
        <div className="flex-1 h-px bg-black/15" />
      </div>
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/divider:opacity-100 transition-opacity">
        {confirming ? (
          <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 border border-black/10">
            <button onClick={() => { onRemove(); setConfirming(false) }} className="text-[10px] text-black/50 hover:text-black font-medium px-1 transition-colors">Remove</button>
            <button onClick={() => setConfirming(false)} className="text-[10px] text-black/30 hover:text-black/60 px-0.5 transition-colors leading-none">×</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-black/25 hover:text-red-500 bg-white/70 rounded-sm p-0.5"><X size={10} /></button>
        )}
      </div>
      <div
        onMouseDown={handleResizeMouseDown}
        className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end justify-center pb-0.5 opacity-0 group-hover/divider:opacity-100 transition-opacity ${isResizing ? 'opacity-100' : ''}`}
      >
        <div className="w-8 h-0.5 bg-black/20 rounded-full" />
      </div>
    </div>
  )
}

// ── PostItemWrapper (local) ──────────────────────────────────────────────────

function PostItemWrapper({ item, sources, onRemove, onOpenSource, onOpenPost, onAddNoteToSpace, onConnectToSource, onUnlinkSource }: {
  item: SpaceItem
  sources: LibrarySource[]
  onRemove: () => void
  onOpenSource: (s: LibrarySource) => void
  onOpenPost: (post: Post) => void
  onAddNoteToSpace: (content: string) => void
  onConnectToSource?: () => void
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
    <div className="group relative">
      <div className="absolute top-2 right-2 z-10">
        {confirming ? (
          <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 border border-black/10">
            <button onClick={() => { onRemove(); setConfirming(false) }} className="text-[10px] text-black/50 hover:text-black font-medium px-1 transition-colors">Remove</button>
            <button onClick={() => setConfirming(false)} className="text-[10px] text-black/30 hover:text-black/60 px-0.5 transition-colors leading-none">×</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-0.5 text-black/30 hover:text-black">
            <X size={12} />
          </button>
        )}
      </div>
      <PostCard post={post} onOpenPost={onOpenPost} onOpenSource={(sourceId) => { const src = sources.find(s => s.id === sourceId); if (src) onOpenSource(src) }} onAddNoteToSpace={onAddNoteToSpace} />
      <div className="px-4 pb-3 -mt-1 flex items-center gap-3">
        {displaySrc && (
          <span className="flex items-center gap-1">
            <button onClick={() => { const src = sources.find(s => s.id === displaySrc.id); if (src) onOpenSource(src) }} className="flex items-center gap-1 text-[9px] text-black/50 hover:text-black transition-colors">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: displaySrc.color }} />
              {displaySrc.name}
            </button>
            {onUnlinkSource && item.sourceRef && (
              <button onClick={onUnlinkSource} title="Unlink source" className="text-black/25 hover:text-black/60 transition-colors leading-none">×</button>
            )}
          </span>
        )}
        {onConnectToSource && (
          <button onClick={onConnectToSource} className="flex items-center gap-1 text-[9px] text-black/30 hover:text-black/60 transition-colors">
            <Database size={9} />{displaySrc ? 'Change source' : 'Link to source'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── SortableItem wrapper ──────────────────────────────────────────────────────

function SortableItem({ id, item, children }: {
  id: string
  item: SpaceItem
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const contentRef = useRef<HTMLDivElement>(null)
  const [rowSpan, setRowSpan] = useState<number | undefined>(undefined)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    function measure() { setRowSpan(Math.ceil((el!.scrollHeight + 16) / 4)) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0 : 1,
        gridColumn: item.type === 'divider' ? '1 / -1' : `span ${item.itemSpan ?? 1}`,
        gridRowEnd: rowSpan ? `span ${rowSpan}` : undefined,
      }}
      className="relative group"
      data-space-item="true"
    >
      <div
        ref={contentRef}
        className="relative"
        style={{ ...(item.itemHeight ?? item.mediaHeight ? { minHeight: item.itemHeight ?? item.mediaHeight } : {}) }}
      >
        {children}
        <div className="absolute bottom-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-black/40 hover:text-black transition-colors p-0.5 touch-none">
            <GripVertical size={13} />
          </span>
        </div>
      </div>
    </div>
  )
}

// ── SourceRow (sidebar) ───────────────────────────────────────────────────────

function SourceRow({ source, active, onClick }: {
  source: LibrarySource
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 px-3 py-2 transition-colors ${active ? 'bg-black text-white' : 'hover:bg-black/5 text-black'}`}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
      <span className="flex-1 text-sm truncate">{source.name}</span>
    </button>
  )
}

// ── AppearsInSourcesBadge ─────────────────────────────────────────────────────

function AppearsInSourcesBadge({ sources }: { sources: LibrarySource[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="absolute top-1.5 left-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 hover:bg-black/80 transition-colors"
        title={`Appears in ${sources.length} other source${sources.length !== 1 ? 's' : ''}`}
      >
        <GitBranch size={8} />
        {sources.length}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-1 min-w-[160px]">
          <p className="px-3 py-1 text-[9px] uppercase tracking-widest text-black/30 font-semibold border-b border-black/8">Also in</p>
          {sources.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 text-black/60">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SourceSpaceWorkspace ──────────────────────────────────────────────────────

function SourceSpaceWorkspace({
  source,
  items,
  allSources,
  allSpaces,
  onAppendItem,
  onRemoveItem,
  onUpdateItem,
  onReorderItems,
  onAddLink,
  onOpenSourcePanel,
  onOpenPostPanel,
  onConnectItemToSource,
  onDuplicateAsSpace,
  sourceAppearsIn,
}: {
  source: LibrarySource
  items: SpaceItem[]
  allSources: LibrarySource[]
  allSpaces: Space[]
  onAppendItem: (item: SpaceItem) => void
  onRemoveItem: (itemId: string) => void
  onUpdateItem: (itemId: string, updates: Partial<SpaceItem>) => void
  onReorderItems: (items: SpaceItem[]) => void
  onAddLink: () => void
  onOpenSourcePanel: () => void
  onOpenPostPanel: (post: Post | null, item?: SpaceItem) => void
  onConnectItemToSource: (item: SpaceItem) => void
  onDuplicateAsSpace: () => void
  sourceAppearsIn?: Record<string, LibrarySource[]>
}) {
  const { addSourceCard, removeSourceCard } = useLibrarySources()
  const { addComment, editComment } = useComments()

  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const contentAreaRef = useRef<HTMLDivElement>(null)

  // Canvas text items
  const [activeTextItemId, setActiveTextItemId] = useState<string | null>(null)
  const [draggedText, setDraggedText] = useState<{ id: string; posX: number; posY: number } | null>(null)
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false)

  // DnD
  const [displayItems, setDisplayItems] = useState<SpaceItem[]>([...items].sort((a, b) => b.addedAt - a.addedAt))
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    setDisplayItems((prev) => {
      const ids = new Set(items.map(i => i.id))
      const current = new Set(prev.map(i => i.id))
      const same = ids.size === current.size && [...ids].every(id => current.has(id))
      if (same) return prev.map(p => items.find(s => s.id === p.id) ?? p)
      return [...items].sort((a, b) => b.addedAt - a.addedAt)
    })
  }, [items])

  useEffect(() => { if (addingNote) noteRef.current?.focus() }, [addingNote])

  const sourceMap = useMemo(() => Object.fromEntries(allSources.map(s => [s.id, s])), [allSources])
  const spaceMap = useMemo(() => Object.fromEntries(allSpaces.map(s => [s.id, s])), [allSpaces])

  const textItems = useMemo(() => displayItems.filter(i => i.type === 'text'), [displayItems])
  const standaloneItems = useMemo(() => displayItems.filter(i => i.type !== 'text'), [displayItems])

  function makeItemId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

  function saveNote() {
    const t = noteDraft.trim()
    if (t) onAppendItem({ type: 'note', id: makeItemId(), content: t, addedAt: Date.now() })
    setNoteDraft('')
    setAddingNote(false)
  }

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const mediaType: 'image' | 'video' | 'audio' = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio'
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) onAppendItem({ type: 'media', id: makeItemId(), content: json.url, mediaType, addedAt: Date.now() })
    } catch { /* upload failed */ }
    setUploading(false)
    e.target.value = ''
  }

  function handleTextDragStart(e: React.PointerEvent<HTMLElement>, item: SpaceItem) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX, startY = e.clientY
    const startPosX = item.posX ?? 24, startPosY = item.posY ?? 24
    setDraggedText({ id: item.id, posX: startPosX, posY: startPosY })
    function onMove(ev: PointerEvent) {
      setDraggedText({ id: item.id, posX: Math.max(0, startPosX + ev.clientX - startX), posY: Math.max(0, startPosY + ev.clientY - startY) })
    }
    function onUp(ev: PointerEvent) {
      onUpdateItem(item.id, { posX: Math.max(0, startPosX + ev.clientX - startX), posY: Math.max(0, startPosY + ev.clientY - startY) })
      setDraggedText(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = standaloneItems.findIndex(i => i.id === active.id)
    const newIndex = standaloneItems.findIndex(i => i.id === over.id)
    const reordered = arrayMove(standaloneItems, oldIndex, newIndex)
    const full = [...reordered, ...textItems]
    setDisplayItems(full)
    onReorderItems(full)
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('[data-space-item]')) return
    if (target.closest('[data-no-canvas]')) return
    if (target.closest('button, input, textarea, a, [role="button"]')) return
    if (activeTextItemId) return
    if (!contentAreaRef.current) return
    const rect = contentAreaRef.current.getBoundingClientRect()
    const posX = Math.max(0, e.clientX - rect.left)
    const posY = Math.max(0, e.clientY - rect.top)
    const id = `${Date.now()}-text`
    onAppendItem({ id, type: 'text', content: '', addedAt: Date.now(), posX, posY })
    setActiveTextItemId(id)
  }

  function handleConnectToSource(sourceId: string, item: SpaceItem) {
    if (item.sourceRef && item.sourceRef !== sourceId) removeSourceCard(item.sourceRef, item.cardRef ?? item.id)
    const updates: Partial<SpaceItem> = { sourceRef: sourceId, cardRef: item.id }
    if (item.type === 'note' && item.content) {
      const newCommentId = addComment(sourceId, item.content)
      updates.commentId = newCommentId
    }
    onUpdateItem(item.id, updates)
    if (item.type !== 'note') {
      const title = item.postData?.title ?? item.type
      const url = item.postData?.url ?? item.postRef?.url ?? ''
      addSourceCard(sourceId, { id: item.id, url, title, addedAt: item.addedAt })
    }
  }

  const activeItem = activeId ? displayItems.find(i => i.id === activeId) : null

  function renderItemContent(item: SpaceItem) {
    const remove = () => {
      onRemoveItem(item.id)
      pushUndo({ label: 'Remove item', undo: () => onAppendItem(item) })
    }
    if (item.type === 'divider') {
      return <DividerItemCard item={item} onRemove={remove} onUpdate={(u) => onUpdateItem(item.id, u)} />
    }
    if (item.type === 'text') {
      return (
        <TextItemCard
          item={item}
          onRemove={remove}
          onUpdate={(u) => onUpdateItem(item.id, u)}
          onActivate={() => setActiveTextItemId(item.id)}
          onDeactivate={() => setActiveTextItemId(p => p === item.id ? null : p)}
        />
      )
    }
    if (item.type === 'post' && item.postData) {
      return (
        <PostItemWrapper
          item={item}
          sources={allSources}
          onRemove={remove}
          onOpenSource={(s) => onOpenSourcePanel()}
          onOpenPost={(post) => onOpenPostPanel(post, item)}
          onAddNoteToSpace={(content) => onAppendItem({ type: 'note', id: makeItemId(), content, addedAt: Date.now(), postRef: item.postData, sourceRef: item.postData?.sourceId })}
          onConnectToSource={() => onConnectItemToSource(item)}
          onUnlinkSource={item.sourceRef ? () => onUpdateItem(item.id, { sourceRef: undefined, cardRef: undefined }) : undefined}
        />
      )
    }
    if (item.type === 'note') {
      const connectedSource = item.sourceRef ? sourceMap[item.sourceRef] : undefined
      return (
        <NoteItemCard
          item={item}
          onRemove={remove}
          onUpdate={(u) => onUpdateItem(item.id, u)}
          onOpenSource={(srcId) => { /* opens the source panel for that source if needed */ }}
          onOpenPost={(post) => onOpenPostPanel(post)}
          onConnectToSource={() => onConnectItemToSource(item)}
          onDisconnectSource={item.sourceRef ? () => {
            removeSourceCard(item.sourceRef!, item.cardRef ?? item.id)
            onUpdateItem(item.id, { sourceRef: undefined, cardRef: undefined, commentId: undefined })
          } : undefined}
          sourceName={connectedSource?.name}
          sourceColor={connectedSource?.color}
          onNoteEdited={item.commentId && item.sourceRef ? (commentId, newText) => editComment(item.sourceRef!, commentId, newText) : undefined}
        />
      )
    }
    if (item.type === 'source') {
      return (
        <SourceItemCard
          item={item}
          source={item.refId ? sourceMap[item.refId] : undefined}
          onRemove={remove}
          onOpenSource={(s) => onOpenSourcePanel()}
        />
      )
    }
    if (item.type === 'space') {
      return (
        <NestedSpaceCard
          item={item}
          space={item.refId ? spaceMap[item.refId] : undefined}
          onNavigate={() => {}}
          onRemove={remove}
        />
      )
    }
    if (item.type === 'media') {
      return <MediaItemCard item={item} onRemove={remove} />
    }
    return null
  }

  const industry = source.industryId
  const category = source.categoryId

  return (
    <div ref={contentAreaRef} className="p-6 max-w-5xl min-h-full relative" onClick={handleCanvasClick}>
      {/* Source header */}
      <div className="mb-6" data-no-canvas="true">
        <div className="h-1 w-full mb-4 rounded-sm" style={{ backgroundColor: source.color }} />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-display font-semibold text-black truncate">{source.name}</h1>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-black/40 hover:text-black/70 transition-colors mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={10} />
                {source.url.replace(/^https?:\/\//, '')}
              </a>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {industry && (
                <span className="text-[10px] px-2 py-0.5 bg-black/6 text-black/50 rounded-full">{industry}</span>
              )}
              {category && (
                <span className="text-[10px] px-2 py-0.5 bg-black/6 text-black/50 rounded-full">{category}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onOpenSourcePanel() }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
              title="Open source panel"
            >
              <Info size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicateAsSpace() }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors"
              title="Duplicate as Space"
            >
              <Layers size={12} />Duplicate as Space
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap" data-no-canvas="true">
        {[
          { label: 'Note', icon: <FileText size={12} />, onClick: () => setAddingNote(true) },
          { label: 'Link', icon: <Link2 size={12} />, onClick: onAddLink },
          { label: uploading ? 'Uploading…' : 'Media', icon: <ImageIcon size={12} />, onClick: () => mediaInputRef.current?.click(), disabled: uploading },
          { label: 'Divider', icon: <Minus size={12} />, onClick: () => onAppendItem({ id: `${Date.now()}-div`, type: 'divider', addedAt: Date.now() }) },
        ].map(({ label, icon, onClick, disabled }) => (
          <button key={label} onClick={onClick} disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors disabled:opacity-40">
            {icon}{label}
          </button>
        ))}
        <button onClick={() => setSourcePickerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors">
          <Database size={12} />Source
        </button>
      </div>

      <input ref={mediaInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleMediaSelect} />

      {/* Inline note input */}
      {addingNote && (
        <div className="mb-4 border border-black/15 bg-white p-3 space-y-2" data-no-canvas="true">
          <textarea ref={noteRef} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(); if (e.key === 'Escape') { setNoteDraft(''); setAddingNote(false) } }}
            placeholder="Write a note… (⌘+Enter to save)" rows={3}
            className="w-full text-sm outline-none resize-none placeholder:text-black/25 bg-transparent"
          />
          <div className="flex gap-2">
            <button onClick={saveNote} className="text-xs bg-black text-white px-3 py-1 hover:bg-black/80 transition-colors">Save</button>
            <button onClick={() => { setNoteDraft(''); setAddingNote(false) }} className="text-xs text-black/40 hover:text-black px-2 py-1 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Content grid */}
      {standaloneItems.length === 0 && textItems.length === 0 && !addingNote ? (
        <div className="text-center py-20 text-black/25 text-sm space-y-2 select-none pointer-events-none">
          <p>This source space is empty.</p>
          <p className="text-[10px]">Click anywhere to start typing, or use the toolbar above.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={standaloneItems.map(i => i.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-x-4 gap-y-0" style={{ gridAutoRows: '4px', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {standaloneItems.map((item) => {
                const appearsIn = sourceAppearsIn?.[item.id]
                return (
                  <SortableItem key={item.id} id={item.id} item={item}>
                    <div className="relative">
                      {renderItemContent(item)}
                      {appearsIn && appearsIn.length > 0 && (
                        <AppearsInSourcesBadge sources={appearsIn} />
                      )}
                    </div>
                  </SortableItem>
                )
              })}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeItem && (
              <div className="opacity-95 shadow-2xl pointer-events-none ring-1 ring-black/10" style={{ transform: 'rotate(0.5deg) scale(1.01)' }}>
                {renderItemContent(activeItem)}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Floating text items */}
      {textItems.map((item) => {
        const isDragging = draggedText?.id === item.id
        const posX = isDragging ? draggedText!.posX : (item.posX ?? 24)
        const posY = isDragging ? draggedText!.posY : (item.posY ?? 24)
        const remove = () => { onRemoveItem(item.id); pushUndo({ label: 'Remove item', undo: () => onAppendItem(item) }) }
        return (
          <div key={item.id} className="group/text-float" style={{ position: 'absolute', left: posX, top: posY, minWidth: 160, maxWidth: 360, zIndex: isDragging ? 20 : 10 }} onClick={(e) => e.stopPropagation()}>
            <div onPointerDown={(e) => handleTextDragStart(e, item)} className="absolute -top-4 left-0 right-0 flex justify-center opacity-0 group-hover/text-float:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none" onClick={(e) => e.stopPropagation()}>
              <GripVertical size={12} className="text-black/30 hover:text-black/60 transition-colors rotate-90" />
            </div>
            <TextItemCard item={item} onRemove={remove} onUpdate={(u) => onUpdateItem(item.id, u)} onActivate={() => setActiveTextItemId(item.id)} onDeactivate={() => setActiveTextItemId(p => p === item.id ? null : p)} />
          </div>
        )
      })}

      {/* Source picker for adding source card to workspace */}
      {sourcePickerOpen && (
        <SourcePickerModal
          sources={allSources}
          onSelect={(id) => { onAppendItem({ type: 'source', id: makeItemId(), refId: id, addedAt: Date.now() }); setSourcePickerOpen(false) }}
          onClose={() => setSourcePickerOpen(false)}
        />
      )}
    </div>
  )
}

// ── Main page inner ───────────────────────────────────────────────────────────

function SourceSpacesPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { sources, setCategory, setIndustry, addTag, removeTag, renameSource, allTags, addSourceCard, removeSourceCard, addAssociation, removeAssociation, setSummary } = useLibrarySources()
  const { categories, createCategory } = useSourceCategories()
  const { industries, createIndustry } = useSourceIndustries()
  const { getItems, appendItem, removeItem, updateItem, reorderItems, updateItemByGroupId: updateSourceItemByGroupId, moveItemToSource: moveSourceItemToSource, getSourcesContainingGroupId } = useSourceItems()
  const { spaces, createSpace, appendItem: appendRemixItem, updateItemByGroupId: updateSpaceItemByGroupId } = useSpaces()
  const { addComment, deleteComment, editComment: editSourceComment, getComments } = useComments()

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [openSourcePanelId, setOpenSourcePanelId] = useState<string | null>(null)
  const [openPostPanel, setOpenPostPanel] = useState<Post | null>(null)
  const [openPostPanelItem, setOpenPostPanelItem] = useState<SpaceItem | null>(null)
  const [connectingItem, setConnectingItem] = useState<SpaceItem | null>(null)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [addLinkSourceId, setAddLinkSourceId] = useState<string | null>(null)
  const [noteForSpace, setNoteForSpace] = useState<{ content: string; sourceRef?: string; commentId?: string } | null>(null)
  const [noteForSpaceNewName, setNoteForSpaceNewName] = useState('')

  // Sidebar expand state (sessionStorage)
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(() => readSSSet(SS_INDUSTRIES_KEY))
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => readSSSet(SS_CATEGORIES_KEY))

  function toggleIndustry(id: string) {
    setExpandedIndustries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      writeSSSet(SS_INDUSTRIES_KEY, next)
      return next
    })
  }

  function toggleCategory(id: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      writeSSSet(SS_CATEGORIES_KEY, next)
      return next
    })
  }

  // Handle ?source=X deep-link
  const paramHandled = useRef(false)
  useEffect(() => {
    if (paramHandled.current) return
    const sourceId = searchParams.get('source')
    if (sourceId && sources.length > 0) {
      paramHandled.current = true
      setSelectedSourceId(sourceId)
    }
  }, [sources.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSource = selectedSourceId ? (sources.find(s => s.id === selectedSourceId) ?? null) : null
  const openSourcePanel = openSourcePanelId ? (sources.find(s => s.id === openSourcePanelId) ?? null) : null

  // ── Merged items: derived (comments + pieces) + user-added ─────────────────
  // Comments → note items linked via commentId; Pieces → post items linked via cardRef
  const selectedSourceItems = useMemo(() => {
    if (!selectedSource) return []

    const comments = getComments(selectedSource.id)
    const commentItems: SpaceItem[] = comments.map(c => ({
      id: `comment-${c.id}`,
      type: 'note' as const,
      content: c.text,
      commentId: c.id,
      sourceRef: selectedSource.id,
      addedAt: c.createdAt,
    }))

    const cardItems: SpaceItem[] = (selectedSource.cards ?? []).map(card => ({
      id: `piece-${card.id}`,
      type: 'post' as const,
      refId: card.id,
      postData: {
        id: card.id,
        title: card.title,
        url: card.url,
        date: new Date(card.addedAt).toISOString(),
        sourceId: selectedSource.id,
        sourceName: selectedSource.name,
        sourceColor: selectedSource.color,
        excerpt: '',
      },
      cardRef: card.id,
      sourceRef: selectedSource.id,
      addedAt: card.addedAt,
    }))

    const userItems = getItems(selectedSource.id)
    // Derived items first (newest first), then user-added items
    return [
      ...[...commentItems, ...cardItems].sort((a, b) => b.addedAt - a.addedAt),
      ...userItems,
    ]
  }, [selectedSource, getComments, getItems])

  // Mutation routing — derived items route to source mutations; user items to useSourceItems
  function routeRemoveItem(itemId: string) {
    if (!selectedSourceId) return
    if (itemId.startsWith('comment-')) {
      deleteComment(selectedSourceId, itemId.slice(8))
    } else if (itemId.startsWith('piece-')) {
      removeSourceCard(selectedSourceId, itemId.slice(6))
    } else {
      removeItem(selectedSourceId, itemId)
    }
  }

  function routeUpdateItem(itemId: string, updates: Partial<SpaceItem>) {
    if (!selectedSourceId) return
    if (itemId.startsWith('comment-') && updates.content) {
      editSourceComment(selectedSourceId, itemId.slice(8), updates.content)
    } else if (!itemId.startsWith('comment-') && !itemId.startsWith('piece-')) {
      updateItem(selectedSourceId, itemId, updates)
    }
  }

  function routeReorderItems(items: SpaceItem[]) {
    if (!selectedSourceId) return
    // Only persist user-added items' ordering (derived items are always re-derived)
    const userItems = items.filter(i => !i.id.startsWith('comment-') && !i.id.startsWith('piece-'))
    reorderItems(selectedSourceId, userItems)
  }

  // Build sidebar tree
  const filteredSources = useMemo(() => {
    const q = sidebarSearch.toLowerCase().trim()
    return q ? sources.filter(s => s.name.toLowerCase().includes(q)) : sources
  }, [sources, sidebarSearch])

  // Group: industryId → { categoryId → sources[], uncategorized: sources[] }
  const sourceTree = useMemo(() => {
    const industryMap = new Map<string, { byCategory: Map<string, LibrarySource[]>; uncategorized: LibrarySource[] }>()
    const noIndustry: LibrarySource[] = []

    for (const s of filteredSources) {
      if (!s.industryId) { noIndustry.push(s); continue }
      if (!industryMap.has(s.industryId)) industryMap.set(s.industryId, { byCategory: new Map(), uncategorized: [] })
      const group = industryMap.get(s.industryId)!
      if (s.categoryId) {
        if (!group.byCategory.has(s.categoryId)) group.byCategory.set(s.categoryId, [])
        group.byCategory.get(s.categoryId)!.push(s)
      } else {
        group.uncategorized.push(s)
      }
    }
    return { industryMap, noIndustry }
  }, [filteredSources])

  // Panel history for back navigation
  const [panelHistory, setPanelHistory] = useState<Array<{ type: 'source'; id: string } | { type: 'post'; post: Post }>>([])

  function openSourcePanelFor(srcId: string, skipHistory = false) {
    if (!skipHistory && openPostPanel) setPanelHistory(h => [...h, { type: 'post', post: openPostPanel }])
    setOpenSourcePanelId(srcId)
    setOpenPostPanel(null)
  }

  function openPostPanelFor(post: Post | null, item?: SpaceItem, skipHistory = false) {
    if (!skipHistory && post && openSourcePanelId) setPanelHistory(h => [...h, { type: 'source', id: openSourcePanelId }])
    setOpenPostPanel(post)
    setOpenPostPanelItem(item ?? null)
    if (post) setOpenSourcePanelId(null)
  }

  function handlePanelBack() {
    const last = panelHistory[panelHistory.length - 1]
    if (!last) { handlePanelClose(); return }
    setPanelHistory(h => h.slice(0, -1))
    if (last.type === 'source') { setOpenSourcePanelId(last.id); setOpenPostPanel(null) }
    else { setOpenPostPanel(last.post); setOpenPostPanelItem(null); setOpenSourcePanelId(null) }
  }

  function handlePanelClose() {
    setPanelHistory([])
    setOpenSourcePanelId(null)
    setOpenPostPanel(null)
    setOpenPostPanelItem(null)
  }

  function handleDuplicateAsSpace() {
    if (!selectedSource) return
    const items = getItems(selectedSource.id)
    const spaceId = createSpace(selectedSource.name)
    for (const item of items) {
      appendRemixItem(spaceId, { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, addedAt: Date.now() })
    }
    router.push(`/remix?space=${spaceId}`)
  }

  const connectingItemRef = useRef(connectingItem)
  useEffect(() => { connectingItemRef.current = connectingItem }, [connectingItem])

  function handleConnectItemToSource(sourceId: string) {
    const item = connectingItemRef.current
    if (!item || !selectedSourceId) return
    setConnectingItem(null)
    if (item.sourceRef && item.sourceRef !== sourceId) removeSourceCard(item.sourceRef, item.cardRef ?? item.id)
    const newSource = sources.find(s => s.id === sourceId)
    const updates: Partial<SpaceItem> = {
      sourceRef: sourceId,
      cardRef: item.id,
      ...(item.postData && newSource ? {
        postData: { ...item.postData, sourceId, sourceName: newSource.name, sourceColor: newSource.color }
      } : {}),
    }
    if (item.type === 'note' && item.content) {
      const newCommentId = addComment(sourceId, item.content)
      updates.commentId = newCommentId
    }
    const gid = item.copyGroupId ?? item.id
    updateSpaceItemByGroupId(gid, updates)       // all Remix spaces
    updateSourceItemByGroupId(gid, updates)      // all source-spaces
    // Move in source-spaces if reassigning
    if (item.sourceRef && item.sourceRef !== sourceId) {
      moveSourceItemToSource(item.sourceRef, sourceId, item.id)
    }
    if (item.type !== 'note') {
      const title = item.postData?.title ?? item.type
      const url = item.postData?.url ?? item.postRef?.url ?? ''
      addSourceCard(sourceId, { id: item.id, url, title, addedAt: item.addedAt })
    }
  }

  const commentToSpaces = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {}
    for (const space of spaces.filter(s => !s.deletedAt)) {
      for (const item of space.items) {
        if (item.type === 'note' && item.commentId) {
          map[item.commentId] ??= []
          if (!map[item.commentId].some(s => s.id === space.id)) map[item.commentId].push({ id: space.id, name: space.name })
        }
      }
    }
    return map
  }, [spaces])

  const totalCount = sources.length

  // "Appears in N sources" — which other source-spaces contain items with the same copyGroupId
  const sourceAppearsIn = useMemo(() => {
    const map: Record<string, LibrarySource[]> = {}
    for (const item of selectedSourceItems) {
      const gid = item.copyGroupId ?? item.id
      const sids = getSourcesContainingGroupId(gid).filter(s => s !== selectedSourceId)
      if (sids.length > 0)
        map[item.id] = sids.map(sid => sources.find(s => s.id === sid)).filter(Boolean) as LibrarySource[]
    }
    return map
  }, [selectedSourceItems, getSourcesContainingGroupId, selectedSourceId, sources])

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <Header activeFeed="source-spaces" sourcesCount={totalCount} />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {/* Left sidebar */}
        <aside className="w-[240px] border-r border-black/10 flex flex-col shrink-0 bg-white overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2.5 border-b border-black/10 shrink-0">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/25 pointer-events-none" />
              <input
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search sources…"
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-black/10 bg-white outline-none focus:border-black/30 transition-colors placeholder:text-black/25"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {/* Industries */}
            {industries.map((industry) => {
              const group = sourceTree.industryMap.get(industry.id)
              if (!group && !sidebarSearch) return null
              const allIndustrySources = group ? [...[...group.byCategory.values()].flat(), ...group.uncategorized] : []
              if (allIndustrySources.length === 0) return null
              const expanded = sidebarSearch ? true : expandedIndustries.has(industry.id)

              return (
                <div key={industry.id}>
                  {/* Industry header */}
                  <button
                    onClick={() => toggleIndustry(industry.id)}
                    className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-black/3 transition-colors text-left"
                  >
                    {expanded ? <ChevronDown size={11} className="text-black/30 shrink-0" /> : <ChevronRight size={11} className="text-black/30 shrink-0" />}
                    {expanded ? <FolderOpen size={12} className="text-black/40 shrink-0" /> : <Folder size={12} className="text-black/40 shrink-0" />}
                    <span className="text-xs font-medium text-black/60 truncate">{industry.name}</span>
                    <span className="text-[9px] text-black/25 ml-auto shrink-0">{allIndustrySources.length}</span>
                  </button>

                  {expanded && group && (
                    <div>
                      {/* Categories within this industry */}
                      {[...group.byCategory.entries()].map(([catId, catSources]) => {
                        const cat = categories.find(c => c.id === catId)
                        const catLabel = cat?.name ?? catId
                        const catExpanded = sidebarSearch ? true : expandedCategories.has(`${industry.id}-${catId}`)
                        return (
                          <div key={catId} className="pl-4">
                            <button
                              onClick={() => toggleCategory(`${industry.id}-${catId}`)}
                              className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-black/3 transition-colors text-left"
                            >
                              {catExpanded ? <ChevronDown size={10} className="text-black/20 shrink-0" /> : <ChevronRight size={10} className="text-black/20 shrink-0" />}
                              <span className="text-[11px] text-black/40 truncate">{catLabel}</span>
                              <span className="text-[9px] text-black/20 ml-auto shrink-0">{catSources.length}</span>
                            </button>
                            {catExpanded && catSources.map(s => (
                              <div key={s.id} className="pl-6">
                                <SourceRow source={s} active={selectedSourceId === s.id} onClick={() => setSelectedSourceId(s.id)} />
                              </div>
                            ))}
                          </div>
                        )
                      })}

                      {/* Uncategorized sources in this industry */}
                      {group.uncategorized.map(s => (
                        <div key={s.id} className="pl-4">
                          <SourceRow source={s} active={selectedSourceId === s.id} onClick={() => setSelectedSourceId(s.id)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Sources with no industry — at bottom */}
            {sourceTree.noIndustry.length > 0 && (
              <div>
                {industries.length > 0 && (
                  <div className="px-3 py-1.5 mt-1 border-t border-black/6">
                    <span className="text-[9px] uppercase tracking-widest text-black/25 font-semibold">Other</span>
                  </div>
                )}
                {sourceTree.noIndustry.map(s => (
                  <SourceRow key={s.id} source={s} active={selectedSourceId === s.id} onClick={() => setSelectedSourceId(s.id)} />
                ))}
              </div>
            )}

            {filteredSources.length === 0 && (
              <p className="text-center py-10 text-xs text-black/25">{sidebarSearch ? 'No matches.' : 'No sources yet.'}</p>
            )}
          </div>
        </aside>

        {/* Main area + inline panels */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-[#fafafa] min-w-[480px]">
            {!selectedSource ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-black/25 space-y-3">
                <Database size={32} className="text-black/10" />
                <p className="text-sm">Select a source from the sidebar</p>
              </div>
            ) : (
              <SourceSpaceWorkspace
                key={selectedSource.id}
                source={selectedSource}
                items={selectedSourceItems}
                allSources={sources}
                allSpaces={spaces.filter(s => !s.deletedAt)}
                onAppendItem={(item) => appendItem(selectedSource.id, item)}
                onRemoveItem={routeRemoveItem}
                onUpdateItem={routeUpdateItem}
                onReorderItems={routeReorderItems}
                onAddLink={() => { setAddLinkSourceId(selectedSource.id); setAddLinkOpen(true) }}
                onOpenSourcePanel={() => openSourcePanelFor(selectedSource.id)}
                onOpenPostPanel={openPostPanelFor}
                onConnectItemToSource={setConnectingItem}
                onDuplicateAsSpace={handleDuplicateAsSpace}
                sourceAppearsIn={sourceAppearsIn}
              />
            )}
          </div>

          {/* Inline Post panel */}
          {openPostPanel && (
            <PostPanel
              inline
              post={openPostPanel}
              allSpaces={spaces}
              onAddNoteToSpaceId={(content, spaceId, commentId) => {}}
              onNavigateToSpace={() => {}}
              onBack={panelHistory.length > 0 ? handlePanelBack : undefined}
              onClose={handlePanelClose}
              onCreateSpace={() => {}}
              savedInSpaces={[]}
              commentToSpaces={commentToSpaces}
            />
          )}

          {/* Inline Source panel */}
          {openSourcePanel && (
            <SourcePanel
              inline
              source={openSourcePanel}
              categories={categories}
              industries={industries}
              allTags={allTags}
              onSetCategory={setCategory}
              onSetIndustry={setIndustry}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onRenameSource={renameSource}
              onCreateCategory={createCategory}
              onCreateIndustry={createIndustry}
              onSetSummary={setSummary}
              onAddNoteToSpace={(content, commentId) => setNoteForSpace({ content, sourceRef: openSourcePanel.id, commentId })}
              onBack={panelHistory.length > 0 ? handlePanelBack : undefined}
              onClose={handlePanelClose}
              onNavigateToSpace={() => {}}
              onCommentEdited={() => {}}
              onAddSourceCard={addSourceCard}
              onRemoveSourceCard={removeSourceCard}
              onOpenPiece={(post) => openPostPanelFor(post)}
              onAddSourceToSpace={() => {}}
              allSpaces={spaces.filter(s => !s.deletedAt)}
              savedLists={spaces.filter(s => !s.deletedAt)}
              commentToSpaces={commentToSpaces}
              allLibrarySources={sources}
              onAddAssociation={(targetId) => addAssociation(openSourcePanel.id, targetId)}
              onRemoveAssociation={(targetId) => removeAssociation(openSourcePanel.id, targetId)}
              onOpenAssociation={(src) => openSourcePanelFor(src.id)}
              onAddPieceToSpace={(spaceId, card) => {
                const src = openSourcePanel
                appendRemixItem(spaceId, {
                  type: 'post' as const, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  postData: { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: src.id, sourceName: src.name, sourceColor: src.color } as Post,
                  copyGroupId: card.id, cardRef: card.id, sourceRef: src.id, addedAt: card.addedAt,
                })
              }}
              onChangePieceSource={(card) => {
                const src = openSourcePanel
                const asItem: SpaceItem = {
                  id: card.id, type: 'post' as const,
                  postData: { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: src.id, sourceName: src.name, sourceColor: src.color } as Post,
                  cardRef: card.id, copyGroupId: card.id, sourceRef: src.id, addedAt: card.addedAt,
                }
                setConnectingItem(asItem)
              }}
              onShowPieceOnAssociations={(card, targetSourceIds) => {
                const src = openSourcePanel
                const base: SpaceItem = {
                  id: card.id, type: 'post' as const,
                  postData: { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: src.id, sourceName: src.name, sourceColor: src.color } as Post,
                  copyGroupId: card.id, cardRef: card.id, sourceRef: src.id, addedAt: card.addedAt,
                }
                for (const sid of targetSourceIds) {
                  appendItem(sid, { ...base, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` })
                  addSourceCard(sid, card)
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Source picker for connecting items */}
      {connectingItem && (
        <SourcePickerModal
          sources={sources}
          title="Link to source"
          onSelect={handleConnectItemToSource}
          onClose={() => setConnectingItem(null)}
        />
      )}

      {/* Add link panel */}
      {addLinkOpen && addLinkSourceId && (
        <AddLinkPanel
          feedId="source-spaces"
          onAdd={(post) => {
            appendItem(addLinkSourceId, { type: 'post', id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, refId: post.id, postData: post, addedAt: Date.now() })
            setAddLinkOpen(false)
            setAddLinkSourceId(null)
          }}
          onClose={() => { setAddLinkOpen(false); setAddLinkSourceId(null) }}
        />
      )}

      {/* Note for space modal */}
      {noteForSpace && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" onClick={() => setNoteForSpace(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none px-4">
            <div className="bg-white w-full max-w-xs border border-black/10 shadow-xl flex flex-col pointer-events-auto" style={{ maxHeight: '60vh' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 shrink-0">
                <h3 className="text-sm font-semibold">Add note to space</h3>
                <button onClick={() => setNoteForSpace(null)} className="text-black/30 hover:text-black p-0.5"><X size={15} /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {spaces.filter(s => !s.deletedAt).map(s => (
                  <button key={s.id} onClick={() => {
                    appendRemixItem(s.id, { type: 'note', id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, content: noteForSpace.content, sourceRef: noteForSpace.sourceRef, commentId: noteForSpace.commentId, addedAt: Date.now() })
                    setNoteForSpace(null)
                  }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 transition-colors text-black">
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="border-t border-black/10 px-3 py-2 shrink-0 flex gap-2">
                <input
                  value={noteForSpaceNewName}
                  onChange={(e) => setNoteForSpaceNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && noteForSpaceNewName.trim()) {
                      const id = createSpace(noteForSpaceNewName.trim())
                      appendRemixItem(id, { type: 'note', id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, content: noteForSpace.content, sourceRef: noteForSpace.sourceRef, commentId: noteForSpace.commentId, addedAt: Date.now() })
                      setNoteForSpace(null)
                      setNoteForSpaceNewName('')
                    }
                  }}
                  placeholder="New space name…"
                  className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}

export default function SourceSpacesPage() {
  return (
    <Suspense fallback={null}>
      <SourceSpacesPageInner />
    </Suspense>
  )
}
