'use client'

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, Check, FileText, Link2, Database, Layers, Search, Loader2, GripVertical, Image as ImageIcon, X, MoveRight, Copy, Tag, ArrowDownUp, Trash2, RotateCcw } from 'lucide-react'
import { Header } from '@/components/Header'
import { PostCard } from '@/components/PostCard'
import { AddLinkPanel } from '@/components/AddLinkPanel'
import { NoteItemCard } from '@/components/NoteItemCard'
import { SourceItemCard } from '@/components/SourceItemCard'
import { NestedSpaceCard } from '@/components/NestedSpaceCard'
import { MediaItemCard } from '@/components/MediaItemCard'
import { SourcePickerModal } from '@/components/SourcePickerModal'
import { SourcePanel } from '@/components/SourcePanel'
import { PostPanel } from '@/components/PostPanel'
import { useSpaces } from '@/hooks/useSpaces'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useSourceCategories } from '@/hooks/useSourceCategories'
import { useSourceIndustries } from '@/hooks/useSourceIndustries'
import { useComments } from '@/hooks/useComments'
import type { Space, SpaceItem, Post, LibrarySource } from '@/lib/types'

// ── Appears-in badge ──────────────────────────────────────────────────────────

function AppearsInBadge({
  spaces,
  onNavigate,
}: {
  spaces: { id: string; name: string }[]
  onNavigate: (spaceId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 hover:bg-black/80 transition-colors"
        title="This item appears in multiple spaces"
      >
        <Copy size={8} />
        {spaces.length}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-1 min-w-[140px]">
          <p className="px-3 py-1 text-[9px] uppercase tracking-widest text-black/30 font-semibold border-b border-black/8">Also in</p>
          {spaces.map(({ id, name }) => (
            <button key={id} onClick={() => { onNavigate(id); setOpen(false) }} className="w-full text-left px-3 py-1.5 text-black/60 hover:text-black hover:bg-black/5 truncate transition-colors">{name}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Move/Copy menu ────────────────────────────────────────────────────────────

function MoveCopyMenu({
  allSpaces,
  currentSpaceId,
  onMove,
  onCopy,
}: {
  allSpaces: Space[]
  currentSpaceId: string
  onMove: (targetId: string) => void
  onCopy: (targetId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'move' | 'copy' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setMode(null) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const others = allSpaces.filter((s) => s.id !== currentSpaceId)

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { setOpen((p) => !p); setMode(null) }}
        className="cursor-pointer text-black/20 hover:text-black/50 transition-colors p-0.5"
        aria-label="Move or copy"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-0.5 min-w-[140px]">
          {!mode ? (
            <>
              <button onClick={() => setMode('copy')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 text-black">
                <Copy size={11} />Copy to…
              </button>
              <button onClick={() => setMode('move')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 text-black">
                <MoveRight size={11} />Move to…
              </button>
            </>
          ) : (
            <>
              <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-black/30 font-semibold border-b border-black/8">
                {mode === 'move' ? 'Move to' : 'Copy to'}
              </div>
              {others.length === 0 ? (
                <p className="px-3 py-2 text-black/30">No other spaces</p>
              ) : (
                others.map((s) => (
                  <button key={s.id} onClick={() => { mode === 'move' ? onMove(s.id) : onCopy(s.id); setOpen(false); setMode(null) }}
                    className="w-full text-left px-3 py-2 hover:bg-black/5 text-black truncate">
                    {s.name}
                  </button>
                ))
              )}
              <button onClick={() => setMode(null)} className="w-full text-left px-3 py-2 hover:bg-black/5 text-black/40 border-t border-black/8">← Back</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── DnD Sortable Item wrapper ─────────────────────────────────────────────────

function SortableItem({
  id, item, allSpaces, currentSpaceId, onMove, onCopy, appearsIn, onNavigateToSpace, children,
}: {
  id: string
  item: SpaceItem
  allSpaces: Space[]
  currentSpaceId: string
  onMove: (targetId: string) => void
  onCopy: (targetId: string) => void
  appearsIn: { id: string; name: string }[]
  onNavigateToSpace: (spaceId: string) => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const contentRef = useRef<HTMLDivElement>(null)
  const [rowSpan, setRowSpan] = useState<number | undefined>(undefined)
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    function measure() {
      const h = el!.scrollHeight
      setRowSpan(Math.ceil((h + 16) / 4))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : 1,
    gridColumn: `span ${item.itemSpan ?? 1}`,
    gridRowEnd: rowSpan ? `span ${rowSpan}` : undefined,
    willChange: isDragging ? 'auto' : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Card content — relative so absolute controls are anchored to it */}
      <div
        ref={contentRef}
        className="relative"
        style={{ ...(item.itemHeight ?? item.mediaHeight ? { minHeight: item.itemHeight ?? item.mediaHeight } : {}) }}
      >
        {children}

        {/* Drag + move/copy handle — overlaid at bottom-right of card */}
        <div className="absolute bottom-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-black/40 hover:text-black transition-colors p-0.5 touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical size={13} />
          </span>
          <MoveCopyMenu allSpaces={allSpaces} currentSpaceId={currentSpaceId} onMove={onMove} onCopy={onCopy} />
        </div>
      </div>

      {/* Appears-in badge — top-left, only when copied to multiple spaces */}
      {appearsIn.length > 0 && (
        <div className="absolute top-1.5 left-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <AppearsInBadge spaces={appearsIn} onNavigate={onNavigateToSpace} />
        </div>
      )}
    </div>
  )
}

// ── SpaceRow (left panel) ────────────────────────────────────────────────────

function SpaceRow({
  space, active, onSelect, onRename, onDelete,
}: {
  space: Space; active: boolean
  onSelect: () => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(space.name)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function h(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])

  function commitRename() {
    const t = draft.trim()
    if (t && t !== space.name) onRename(space.id, t)
    else setDraft(space.name)
    setRenaming(false)
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${active ? 'bg-black text-white' : 'hover:bg-black/5 text-black'}`}
      onClick={onSelect}
      onDoubleClick={() => setRenaming(true)}
    >
      <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${active ? 'bg-white border-white' : 'border-black/20'}`}>
        {active && <Check size={9} className="text-black" strokeWidth={3} />}
      </div>

      {renaming ? (
        <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setDraft(space.name); setRenaming(false) } }}
          onBlur={commitRename} onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm border border-black/40 px-1.5 py-0.5 outline-none focus:border-black/60 transition-colors bg-white text-black"
        />
      ) : (
        <span className="flex-1 text-sm font-medium truncate">{space.name}</span>
      )}

      {(space.tags ?? []).length > 0 && (
        <div className="flex gap-1 overflow-hidden max-w-[70px]">
          {(space.tags ?? []).slice(0, 2).map((tag) => (
            <span key={tag} className={`text-[8px] px-1.5 py-0.5 rounded-full truncate ${active ? 'bg-white/20 text-white/70' : 'bg-black/6 text-black/35'}`}>{tag}</span>
          ))}
        </div>
      )}
      <span className={`text-xs shrink-0 tabular-nums ${active ? 'text-white/50' : 'text-black/30'}`}>{space.items.length}</span>

      <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setMenuOpen((p) => !p)}
          className={`opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 transition-opacity ${active ? 'text-white' : ''}`}>
          <MoreHorizontal size={13} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-0.5 min-w-[110px]">
            <button onClick={() => { setMenuOpen(false); setRenaming(true) }} className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors text-black">Rename</button>
            <button onClick={() => { setMenuOpen(false); onDelete(space.id) }} className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors text-red-500">Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PostItemWrapper — source link footer ────────────────────────────────────

function PostItemWrapper({
  item,
  sources,
  onRemove,
  onOpenSource,
  onAddNoteToSpace,
  onOpenPost,
  onConnectToSource,
  onUnlinkSource,
}: {
  item: SpaceItem
  sources: LibrarySource[]
  onRemove: () => void
  onOpenSource: (s: LibrarySource) => void
  onAddNoteToSpace: (content: string) => void
  onOpenPost: (post: Post) => void
  onConnectToSource?: () => void
  onUnlinkSource?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const post = item.postData!

  return (
    <div className="group relative">
      {/* Remove from space — top-right */}
      <div className="absolute top-2 right-2 z-10">
        {confirming ? (
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 border border-black/10">
            <span className="text-[10px] text-black/40">Remove?</span>
            <button onClick={onRemove} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1">Yes</button>
            <button onClick={() => setConfirming(false)} className="text-[10px] text-black/40 hover:text-black px-1">No</button>
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
        {item.sourceRef && (() => {
          const src = sources.find((s) => s.id === item.sourceRef)
          if (!src) return null
          return (
            <span className="flex items-center gap-1">
              <button
                onClick={() => onOpenSource(src)}
                className="flex items-center gap-1 text-[9px] text-black/50 hover:text-black transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: src.color }} />
                {src.name}
              </button>
              {onUnlinkSource && (
                <button
                  onClick={onUnlinkSource}
                  title="Unlink source"
                  className="text-black/25 hover:text-black/60 transition-colors leading-none"
                >
                  ×
                </button>
              )}
            </span>
          )
        })()}
        {onConnectToSource && (
          <button
            onClick={onConnectToSource}
            className="flex items-center gap-1 text-[9px] text-black/30 hover:text-black/60 transition-colors"
          >
            <Database size={9} />{item.sourceRef ? 'Change source' : 'Link to source'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── SpaceWorkspace ────────────────────────────────────────────────────────────

function SpaceWorkspace({
  space, allSpaces, onRename, onUpdateDescription,
  onAddNote, onAddSource, onNestSpace, onRemoveItem, onReorderItems,
  onUpdateItem, onAddLink, onAddMedia, onMoveItem, onCopyItem, onUpdateTags,
  onNavigateToSpace, onOpenSourcePanel, onOpenPostPanel, onConnectItemToSource,
}: {
  space: Space; allSpaces: Space[]
  onRename: (id: string, name: string) => void
  onUpdateDescription: (id: string, desc: string) => void
  onAddNote: (spaceId: string, content: string, meta?: { sourceRef?: string; postRef?: Post }) => void
  onAddSource: (spaceId: string, sourceId: string) => void
  onNestSpace: (parentId: string, childId: string) => void
  onRemoveItem: (spaceId: string, itemId: string) => void
  onReorderItems: (spaceId: string, items: SpaceItem[]) => void
  onUpdateItem: (spaceId: string, itemId: string, updates: Partial<SpaceItem>) => void
  onAddLink: () => void
  onAddMedia: (spaceId: string, url: string, mediaType: 'image' | 'video' | 'audio') => void
  onMoveItem: (itemId: string, targetSpaceId: string) => void
  onCopyItem: (itemId: string, targetSpaceId: string) => void
  onUpdateTags: (spaceId: string, tags: string[]) => void
  onNavigateToSpace: (spaceId: string) => void
  onOpenSourcePanel: (source: LibrarySource | null) => void
  onOpenPostPanel: (post: Post | null, item?: SpaceItem) => void
  onConnectItemToSource: (item: SpaceItem) => void
}) {
  const { sources, addSourceCard, removeSourceCard } = useLibrarySources()
  const { editComment } = useComments()

  // Inline name
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(space.name)
  const nameRef = useRef<HTMLInputElement>(null)

  // Inline description
  const [descDraft, setDescDraft] = useState(space.description ?? '')
  const descRef = useRef<HTMLTextAreaElement>(null)

  // Tags
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Note input
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const [sourcePickerOpen, setSourcePickerOpen] = useState(false)

  // Space nesting dropdown
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false)
  const spaceDropdownRef = useRef<HTMLDivElement>(null)


  // Media upload
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // DnD
  const [displayItems, setDisplayItems] = useState<SpaceItem[]>([...space.items].sort((a, b) => b.addedAt - a.addedAt))
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Sync displayItems when space.items changes externally
  useEffect(() => {
    setDisplayItems((prev) => {
      const ids = new Set(space.items.map((i) => i.id))
      const current = new Set(prev.map((i) => i.id))
      // If same set of IDs, keep current order (user may have reordered)
      const same = ids.size === current.size && [...ids].every((id) => current.has(id))
      if (same) return prev.map((p) => space.items.find((s) => s.id === p.id) ?? p)
      // Items added/removed — re-sort by addedAt
      return [...space.items].sort((a, b) => b.addedAt - a.addedAt)
    })
  }, [space.items])

  useEffect(() => { setNameDraft(space.name) }, [space.name])
  useEffect(() => { setDescDraft(space.description ?? '') }, [space.description])
  useEffect(() => { if (editingName) nameRef.current?.focus() }, [editingName])
  useEffect(() => { if (addingNote) noteRef.current?.focus() }, [addingNote])

  useEffect(() => {
    if (!spaceDropdownOpen) return
    function h(e: MouseEvent) { if (spaceDropdownRef.current && !spaceDropdownRef.current.contains(e.target as Node)) setSpaceDropdownOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [spaceDropdownOpen])

  function commitName() {
    const t = nameDraft.trim()
    if (t && t !== space.name) onRename(space.id, t)
    else setNameDraft(space.name)
    setEditingName(false)
  }

  function commitDesc() {
    if (descDraft !== (space.description ?? '')) onUpdateDescription(space.id, descDraft)
  }

  function saveNote() {
    const t = noteDraft.trim()
    if (t) onAddNote(space.id, t)
    setNoteDraft('')
    setAddingNote(false)
  }

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const mediaType: 'image' | 'video' | 'audio' = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video' : 'audio'
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) onAddMedia(space.id, json.url, mediaType)
    } catch { /* upload failed */ }
    setUploading(false)
    e.target.value = ''
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = displayItems.findIndex((i) => i.id === active.id)
    const newIndex = displayItems.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(displayItems, oldIndex, newIndex)
    setDisplayItems(reordered)
    onReorderItems(space.id, reordered)
  }

  const activeItem = activeId ? displayItems.find((i) => i.id === activeId) : null

  const sourceMap = useMemo(() => Object.fromEntries(sources.map((s) => [s.id, s])), [sources])
  const spaceMap = useMemo(() => Object.fromEntries(allSpaces.map((s) => [s.id, s])), [allSpaces])

  // "Appears in" map: copyGroupId → list of space IDs that contain it
  const appearsInMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const s of allSpaces) {
      for (const i of s.items) {
        const gid = i.copyGroupId ?? i.id
        if (!map[gid]) map[gid] = []
        map[gid].push(s.id)
      }
    }
    return map
  }, [allSpaces])

  function getAppearsIn(item: SpaceItem): { id: string; name: string }[] {
    const gid = item.copyGroupId ?? item.id
    return (appearsInMap[gid] ?? [])
      .filter((sid) => sid !== space.id)
      .map((sid) => spaceMap[sid])
      .filter(Boolean)
      .map((s) => ({ id: s!.id, name: s!.name }))
  }
  const nestedIds = new Set(space.items.filter((i) => i.type === 'space').map((i) => i.refId))
  const nestableSpaces = allSpaces.filter((s) => s.id !== space.id && !nestedIds.has(s.id))

  function renderItemContent(item: SpaceItem) {
    const remove = () => onRemoveItem(space.id, item.id)
    if (item.type === 'post' && item.postData) {
      return (
        <PostItemWrapper
          item={item}
          sources={sources}
          onRemove={remove}
          onOpenSource={(s) => onOpenSourcePanel(s)}
          onOpenPost={(post) => onOpenPostPanel(post, item)}
          onAddNoteToSpace={(content) => onAddNote(space.id, content, { postRef: item.postData, sourceRef: item.postData?.sourceId })}
          onConnectToSource={() => onConnectItemToSource(item)}
          onUnlinkSource={item.sourceRef ? () => onUpdateItem(space.id, item.id, { sourceRef: undefined, cardRef: undefined }) : undefined}
        />
      )
    }
    if (item.type === 'note') {
      const connectedSource = item.sourceRef ? sourceMap[item.sourceRef] : undefined
      return (
        <NoteItemCard
          item={item}
          onRemove={remove}
          onUpdate={(updates) => onUpdateItem(space.id, item.id, updates)}
          onOpenSource={(sourceId) => {
            const src = sourceMap[sourceId]
            if (src) onOpenSourcePanel(src)
          }}
          onOpenPost={(post) => onOpenPostPanel(post)}
          onConnectToSource={() => onConnectItemToSource(item)}
          onDisconnectSource={item.sourceRef ? () => {
            removeSourceCard(item.sourceRef!, item.cardRef ?? item.id)
            onUpdateItem(space.id, item.id, { sourceRef: undefined, cardRef: undefined, commentId: undefined })
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
          onOpenSource={(s) => onOpenSourcePanel(s)}
        />
      )
    }
    if (item.type === 'space') {
      return (
        <NestedSpaceCard
          item={item}
          space={item.refId ? spaceMap[item.refId] : undefined}
          onNavigate={() => window.dispatchEvent(new CustomEvent('remix:navigate-space', { detail: item.refId }))}
          onRemove={remove}
        />
      )
    }
    if (item.type === 'media') {
      return <MediaItemCard item={item} onRemove={remove} />
    }
    return null
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Space header */}
      <div className="mb-6 space-y-2">
        {editingName ? (
          <input ref={nameRef} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameDraft(space.name); setEditingName(false) } }}
            onBlur={commitName}
            className="text-xl font-display font-semibold text-black w-full border-b border-black/30 outline-none pb-0.5 bg-transparent"
          />
        ) : (
          <h1 className="text-xl font-display font-semibold text-black cursor-text hover:opacity-70 transition-opacity"
            onClick={() => setEditingName(true)}>
            {space.name}
          </h1>
        )}
        <textarea ref={descRef} value={descDraft} onChange={(e) => setDescDraft(e.target.value)}
          onBlur={commitDesc} rows={2} placeholder="Add a note about this space…"
          className="w-full text-sm text-black/50 resize-none outline-none placeholder:text-black/20 bg-transparent leading-relaxed"
        />
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(space.tags ?? []).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 text-[10px] bg-black/6 text-black/50 px-2 py-0.5 rounded-full">
              <Tag size={8} />
              {tag}
              <button onClick={() => onUpdateTags(space.id, (space.tags ?? []).filter((t) => t !== tag))} className="text-black/30 hover:text-black ml-0.5">×</button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                e.preventDefault()
                const tag = tagInput.trim().replace(/,$/, '')
                if (tag && !(space.tags ?? []).includes(tag)) onUpdateTags(space.id, [...(space.tags ?? []), tag])
                setTagInput('')
              }
              if (e.key === 'Backspace' && !tagInput && (space.tags ?? []).length > 0) {
                onUpdateTags(space.id, (space.tags ?? []).slice(0, -1))
              }
            }}
            placeholder={(space.tags ?? []).length === 0 ? '+ Add tag…' : '+ tag'}
            className="text-[10px] text-black/40 outline-none bg-transparent placeholder:text-black/20 min-w-[60px] w-auto"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {[
          { label: 'Note', icon: <FileText size={12} />, onClick: () => setAddingNote(true) },
          { label: 'Link', icon: <Link2 size={12} />, onClick: onAddLink },
          { label: uploading ? 'Uploading…' : 'Media', icon: <ImageIcon size={12} />, onClick: () => mediaInputRef.current?.click(), disabled: uploading },
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

        <div ref={spaceDropdownRef} className="relative">
          <button onClick={() => setSpaceDropdownOpen((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 text-black/50 hover:border-black/40 hover:text-black transition-colors">
            <Layers size={12} />Space
          </button>
          {spaceDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-0.5 min-w-[160px] max-h-48 overflow-y-auto">
              {nestableSpaces.length === 0 ? (
                <p className="px-3 py-2 text-black/30">No other spaces</p>
              ) : (
                nestableSpaces.map((s) => (
                  <button key={s.id} onClick={() => { onNestSpace(space.id, s.id); setSpaceDropdownOpen(false) }}
                    className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors text-black">
                    {s.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden media input */}
      <input ref={mediaInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleMediaSelect} />

      {/* Inline note input */}
      {addingNote && (
        <div className="mb-4 border border-black/15 bg-white p-3 space-y-2">
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

      {/* Content grid with DnD */}
      {displayItems.length === 0 && !addingNote ? (
        <div className="text-center py-20 text-black/25 text-sm space-y-2">
          <p>This space is empty.</p>
          <p className="text-[10px]">Add a note, link, media, source, or nested space above.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={displayItems.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-x-4 gap-y-0" style={{ gridAutoRows: '4px', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {displayItems.map((item) => (
                <SortableItem
                  key={item.id}
                  id={item.id}
                  item={item}
                  allSpaces={allSpaces}
                  currentSpaceId={space.id}
                  onMove={(targetId) => onMoveItem(item.id, targetId)}
                  onCopy={(targetId) => onCopyItem(item.id, targetId)}
                  appearsIn={getAppearsIn(item)}
                  onNavigateToSpace={onNavigateToSpace}
                >
                  {renderItemContent(item)}
                </SortableItem>
              ))}
            </div>
          </SortableContext>

          {/* DnD drag overlay */}
          <DragOverlay dropAnimation={null}>
            {activeItem && (
              <div className="opacity-95 shadow-2xl pointer-events-none ring-1 ring-black/10"
                style={{ transform: 'rotate(0.5deg) scale(1.01)' }}>
                {renderItemContent(activeItem)}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Source picker for adding source to space */}
      {sourcePickerOpen && (
        <SourcePickerModal
          sources={sources}
          onSelect={(id) => onAddSource(space.id, id)}
          onClose={() => setSourcePickerOpen(false)}
        />
      )}

    </div>
  )
}

// ── Trash bin (left panel) ────────────────────────────────────────────────────

function TrashBin({
  spaces, onRestore, onPermanentDelete,
}: {
  spaces: Space[]
  onRestore: (id: string) => void
  onPermanentDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div className="border-t border-black/10 shrink-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-black/30 hover:text-black/60 transition-colors"
      >
        <Trash2 size={11} />
        <span>Trash ({spaces.length})</span>
        <span className="ml-auto">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="pb-1">
          {spaces.map((s) => (
            <div key={s.id} className="group flex items-center gap-2 px-3 py-2 hover:bg-black/3 transition-colors">
              <span className="flex-1 text-xs text-black/40 truncate">{s.name}</span>
              {confirmId === s.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-black/40">Delete forever?</span>
                  <button onClick={() => { onPermanentDelete(s.id); setConfirmId(null) }} className="text-[10px] text-red-500 font-medium px-1">Yes</button>
                  <button onClick={() => setConfirmId(null)} className="text-[10px] text-black/40 px-1">No</button>
                </div>
              ) : (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => onRestore(s.id)} className="text-[10px] text-black/40 hover:text-black flex items-center gap-0.5 px-1">
                    <RotateCcw size={9} />Restore
                  </button>
                  <button onClick={() => setConfirmId(s.id)} className="text-[10px] text-red-400 hover:text-red-600 px-1">
                    <Trash2 size={9} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

function RemixPageInner() {
  const {
    spaces, loaded, createSpace, deleteSpace, restoreSpace, permanentDeleteSpace, trashedSpaces,
    renameSpace, updateDescription, addPost, addNote, addSource, addMedia,
    nestSpace, removeItem, reorderItems, updateItem, appendItem, updateSpaceTags,
  } = useSpaces()

  const { sources, setCategory, setIndustry, addTag, removeTag, renameSource, allTags, addSourceCard, removeSourceCard } = useLibrarySources()
  const { categories, createCategory } = useSourceCategories()
  const { industries, createIndustry } = useSourceIndustries()
  const { addComment } = useComments()
  const [openSourcePanelId, setOpenSourcePanelId] = useState<string | null>(null)
  const openSourcePanel = openSourcePanelId ? (sources.find((s) => s.id === openSourcePanelId) ?? null) : null
  const [openPostPanel, setOpenPostPanel] = useState<Post | null>(null)
  const [openPostPanelItem, setOpenPostPanelItem] = useState<SpaceItem | null>(null)
  const [connectingItem, setConnectingItem] = useState<SpaceItem | null>(null)
  const [pendingPost, setPendingPost] = useState<Post | null>(null)
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => setHasMounted(true), [])
  const [noteForSpace, setNoteForSpace] = useState<{ content: string; sourceRef?: string; commentId?: string } | null>(null)
  const [noteForSpaceNewName, setNoteForSpaceNewName] = useState('')

  const [panelHistory, setPanelHistory] = useState<Array<{ type: 'source'; id: string } | { type: 'post'; post: Post }>>([])

  // Only one inline panel open at a time
  function openSourcePanelExclusive(src: LibrarySource | null, skipHistory = false) {
    if (!skipHistory && src && openPostPanel) {
      setPanelHistory(h => [...h, { type: 'post', post: openPostPanel }])
    }
    setOpenSourcePanelId(src?.id ?? null)
    if (src) setOpenPostPanel(null)
  }
  function openPostPanelExclusive(post: Post | null, item?: SpaceItem, skipHistory = false) {
    if (!skipHistory && post && openSourcePanelId) {
      setPanelHistory(h => [...h, { type: 'source', id: openSourcePanelId }])
    }
    setOpenPostPanel(post)
    setOpenPostPanelItem(item ?? null)
    if (post) setOpenSourcePanelId(null)
  }
  function handleRemixPanelBack() {
    const last = panelHistory[panelHistory.length - 1]
    if (!last) { handleRemixPanelClose(); return }
    setPanelHistory(h => h.slice(0, -1))
    if (last.type === 'source') {
      const src = sources.find(s => s.id === last.id)
      if (src) { setOpenSourcePanelId(last.id); setOpenPostPanel(null) }
    } else {
      setOpenPostPanel(last.post); setOpenPostPanelItem(null); setOpenSourcePanelId(null)
    }
  }
  function handleRemixPanelClose() {
    setPanelHistory([])
    setOpenSourcePanelId(null)
    setOpenPostPanel(null)
    setOpenPostPanelItem(null)
  }

  const commentToSpaces = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {}
    for (const space of spaces.filter(s => !s.deletedAt)) {
      for (const item of space.items) {
        if (item.type === 'note' && item.commentId) {
          map[item.commentId] ??= []
          if (!map[item.commentId].some(s => s.id === space.id)) {
            map[item.commentId].push({ id: space.id, name: space.name })
          }
        }
      }
    }
    return map
  }, [spaces])

  const postToSpaces = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {}
    for (const space of spaces.filter(s => !s.deletedAt)) {
      for (const item of space.items) {
        if (item.type === 'post' && item.postData) {
          const pid = item.postData.id
          map[pid] ??= []
          if (!map[pid].some(s => s.id === space.id)) {
            map[pid].push({ id: space.id, name: space.name })
          }
        }
      }
    }
    return map
  }, [spaces])

  const spacesRef = useRef(spaces)
  useEffect(() => { spacesRef.current = spaces }, [spaces])

  const connectingItemRef = useRef(connectingItem)
  useEffect(() => { connectingItemRef.current = connectingItem }, [connectingItem])

  const handleConnectItemToSource = useCallback((sourceId: string) => {
    const item = connectingItemRef.current
    if (!item) return
    setConnectingItem(null)
    const space = spacesRef.current.find((s) => s.items.some((i) => i.id === item.id))
    if (!space) return
    // If already connected to a different source, clean up the old card
    if (item.sourceRef && item.sourceRef !== sourceId) {
      removeSourceCard(item.sourceRef, item.cardRef ?? item.id)
    }
    const updates: Partial<SpaceItem> = { sourceRef: sourceId, cardRef: item.id }
    if (item.type === 'note' && item.content) {
      const newCommentId = addComment(sourceId, item.content)
      updates.commentId = newCommentId
    }
    updateItem(space.id, item.id, updates)
    // Notes go to Analysis Notes via addComment only — never create a Piece
    if (item.type !== 'note') {
      const title = item.postData?.title ?? item.type
      const url = item.postData?.url ?? item.postRef?.url ?? ''
      addSourceCard(sourceId, { id: item.id, url, title, addedAt: item.addedAt })
    }
  }, [addComment, addSourceCard, removeSourceCard, updateItem])

  const searchParams = useSearchParams()
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt'>('updatedAt')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [addLinkSpaceId, setAddLinkSpaceId] = useState<string | null>(null)

  // Nested space navigation via custom event
  useEffect(() => {
    function handler(e: Event) {
      const id = (e as CustomEvent<string>).detail
      if (id) setSelectedSpaceId(id)
    }
    window.addEventListener('remix:navigate-space', handler)
    return () => window.removeEventListener('remix:navigate-space', handler)
  }, [])

  // Handle ?space=X deep-link on initial load — triggers as soon as spaces are available (cache or DB)
  const spaceParamHandled = useRef(false)
  useEffect(() => {
    if (spaceParamHandled.current) return
    const spaceId = searchParams.get('space')
    if (spaceId && spaces.length > 0) {
      spaceParamHandled.current = true
      setSelectedSpaceId(spaceId)
      // Pick up a post that was open in Research Feed before navigating here
      try {
        const pending = sessionStorage.getItem('pendingOpenPost')
        if (pending) {
          sessionStorage.removeItem('pendingOpenPost')
          setPendingPost(JSON.parse(pending) as Post)
        }
      } catch {}
      // Pick up a source panel that was open in Feed before navigating here
      try {
        const pendingSource = sessionStorage.getItem('pendingOpenSource')
        if (pendingSource) {
          sessionStorage.removeItem('pendingOpenSource')
          setPendingSourceId(pendingSource)
        }
      } catch {}
    }
  }, [spaces.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const openPostPanelRef = useRef(openPostPanelExclusive)
  useEffect(() => { openPostPanelRef.current = openPostPanelExclusive })

  useEffect(() => {
    if (!pendingPost || !selectedSpaceId) return
    const post = pendingPost
    setPendingPost(null)
    const t = setTimeout(() => openPostPanelRef.current(post, undefined, true), 80)
    return () => clearTimeout(t)
  }, [pendingPost, selectedSpaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openSourcePanelRef = useRef(openSourcePanelExclusive)
  useEffect(() => { openSourcePanelRef.current = openSourcePanelExclusive })

  useEffect(() => {
    if (!pendingSourceId || !selectedSpaceId) return
    const id = pendingSourceId
    setPendingSourceId(null)
    const t = setTimeout(() => {
      const src = sources.find(s => s.id === id)
      if (src) openSourcePanelRef.current(src, true)
    }, 80)
    return () => clearTimeout(t)
  }, [pendingSourceId, selectedSpaceId, sources]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSpace = selectedSpaceId ? (spaces.find((s) => s.id === selectedSpaceId) ?? null) : null

  useEffect(() => {
    if (!sortOpen) return
    function h(e: MouseEvent) { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [sortOpen])

  const filteredSpaces = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = q ? spaces.filter((s) => s.name.toLowerCase().includes(q) || (s.tags ?? []).some((t) => t.toLowerCase().includes(q))) : [...spaces]
    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'createdAt') return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      return (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0)
    })
    return filtered
  }, [spaces, searchQuery, sortBy])

  function handleCreateAndSelect() {
    const id = createSpace('New space')
    setSelectedSpaceId(id)
  }

  const addPostRef = useRef(addPost)
  useEffect(() => { addPostRef.current = addPost }, [addPost])

  const handleLinkAdd = useCallback((post: Post) => {
    if (addLinkSpaceId) addPostRef.current(addLinkSpaceId, post)
    setAddLinkOpen(false)
    setAddLinkSpaceId(null)
  }, [addLinkSpaceId])

  function openAddLink(spaceId: string) {
    setAddLinkSpaceId(spaceId)
    setAddLinkOpen(true)
  }

  function copyItemToSpace(toSpaceId: string, item: SpaceItem) {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const copyGroupId = item.copyGroupId ?? item.id
    appendItem(toSpaceId, { ...item, id: newId, copyGroupId, addedAt: Date.now() })
  }

  function handleMoveItem(fromSpaceId: string, itemId: string, toSpaceId: string) {
    const space = spaces.find((s) => s.id === fromSpaceId)
    const item = space?.items.find((i) => i.id === itemId)
    if (!item) return
    copyItemToSpace(toSpaceId, item)
    removeItem(fromSpaceId, itemId)
  }

  function handleCopyItem(fromSpaceId: string, itemId: string, toSpaceId: string) {
    const space = spaces.find((s) => s.id === fromSpaceId)
    const item = space?.items.find((i) => i.id === itemId)
    if (!item) return
    copyItemToSpace(toSpaceId, item)
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <Header activeFeed="remix" />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {/* Left panel */}
        <aside className="w-[280px] border-r border-black/10 flex flex-col shrink-0 bg-white">
          <div className="px-4 py-3.5 border-b border-black/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black">Spaces</h2>
            <div className="flex items-center gap-2">
              <div ref={sortRef} className="relative">
                <button
                  onClick={() => setSortOpen((p) => !p)}
                  className="text-black/30 hover:text-black transition-colors p-0.5"
                  title="Sort spaces"
                >
                  <ArrowDownUp size={13} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-0.5 min-w-[140px]">
                    {([['name', 'Alphabetical'], ['updatedAt', 'Last edited'], ['createdAt', 'Date added']] as const).map(([val, label]) => (
                      <button key={val} onClick={() => { setSortBy(val); setSortOpen(false) }}
                        className={`w-full text-left px-3 py-2 hover:bg-black/5 flex items-center gap-2 ${sortBy === val ? 'text-black font-medium' : 'text-black/60'}`}>
                        {sortBy === val && <Check size={10} />}
                        {sortBy !== val && <span className="w-[10px]" />}
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleCreateAndSelect} className="text-xs text-black/40 hover:text-black transition-colors flex items-center gap-1">
                <Plus size={13} />New
              </button>
            </div>
          </div>
          <div className="px-3 py-2 border-b border-black/10">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/25 pointer-events-none" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search spaces…"
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-black/10 bg-white outline-none focus:border-black/30 transition-colors placeholder:text-black/25"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {!hasMounted || (filteredSpaces.length === 0 && !loaded) ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-black/20" size={18} /></div>
            ) : filteredSpaces.length === 0 ? (
              <p className="text-center py-10 text-xs text-black/25">{searchQuery ? 'No matches.' : 'No spaces yet.'}</p>
            ) : (
              filteredSpaces.map((space) => (
                <SpaceRow
                  key={space.id}
                  space={space}
                  active={selectedSpaceId === space.id}
                  onSelect={() => setSelectedSpaceId(space.id)}
                  onRename={renameSpace}
                  onDelete={(id) => { deleteSpace(id); if (selectedSpaceId === id) setSelectedSpaceId(null) }}
                />
              ))
            )}
          </div>

          {/* Trash bin */}
          {trashedSpaces.length > 0 && (
            <TrashBin
              spaces={trashedSpaces}
              onRestore={restoreSpace}
              onPermanentDelete={permanentDeleteSpace}
            />
          )}
        </aside>

        {/* Right panel + inline source panel */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-[#fafafa] min-w-[480px]">
            {!selectedSpace ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-black/25 space-y-3">
                <Layers size={32} className="text-black/10" />
                <p className="text-sm">Select a space to open it</p>
                <button onClick={handleCreateAndSelect}
                  className="mt-2 text-xs border border-black/15 px-4 py-2 text-black/40 hover:text-black hover:border-black/40 transition-colors">
                  + New space
                </button>
              </div>
            ) : (
              <SpaceWorkspace
                key={selectedSpace.id}
                space={selectedSpace}
                allSpaces={spaces}
                onRename={renameSpace}
                onUpdateDescription={updateDescription}
                onAddNote={addNote}
                onAddSource={addSource}
                onNestSpace={nestSpace}
                onRemoveItem={removeItem}
                onReorderItems={reorderItems}
                onUpdateItem={updateItem}
                onAddLink={() => openAddLink(selectedSpace.id)}
                onAddMedia={addMedia}
                onMoveItem={(itemId, targetId) => handleMoveItem(selectedSpace.id, itemId, targetId)}
                onCopyItem={(itemId, targetId) => handleCopyItem(selectedSpace.id, itemId, targetId)}
                onUpdateTags={updateSpaceTags}
                onNavigateToSpace={setSelectedSpaceId}
                onOpenSourcePanel={openSourcePanelExclusive}
                onOpenPostPanel={openPostPanelExclusive}
                onConnectItemToSource={setConnectingItem}
              />
            )}
          </div>

          {openPostPanel && (
            <PostPanel
              inline
              post={openPostPanel}
              allSpaces={spaces}
              onAddNoteToSpaceId={(content, spaceId, commentId) => addNote(spaceId, content, { postRef: openPostPanel ?? undefined, sourceRef: openPostPanel?.sourceId, commentId })}
              onNavigateToSpace={(spaceId) => setSelectedSpaceId(spaceId)}
              onConnectToSource={openPostPanelItem ? () => setConnectingItem(openPostPanelItem) : undefined}
              onBack={panelHistory.length > 0 ? handleRemixPanelBack : undefined}
              onClose={handleRemixPanelClose}
              onCreateSpace={(name, noteContent, commentId) => {
                const id = createSpace(name)
                addNote(id, noteContent, { postRef: openPostPanel ?? undefined, sourceRef: openPostPanel?.sourceId, commentId })
              }}
              savedInSpaces={postToSpaces[openPostPanel?.id ?? ''] ?? []}
              commentToSpaces={commentToSpaces}
            />
          )}

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
              onAddNoteToSpace={(content, commentId) => setNoteForSpace({ content, sourceRef: openSourcePanel.id, commentId })}
              onBack={panelHistory.length > 0 ? handleRemixPanelBack : undefined}
              onClose={handleRemixPanelClose}
              onNavigateToSpace={(spaceId) => setSelectedSpaceId(spaceId)}
              onCommentEdited={(commentId, newText) => {
                for (const space of spaces) {
                  for (const item of space.items) {
                    if (item.commentId === commentId) {
                      updateItem(space.id, item.id, { content: newText })
                    }
                  }
                }
              }}
              onAddSourceCard={addSourceCard}
              onRemoveSourceCard={removeSourceCard}
              onOpenPiece={(post) => openPostPanelExclusive(post)}
              onAddSourceToSpace={(spaceId) => addSource(spaceId, openSourcePanel.id)}
              allSpaces={spaces.filter(s => !s.deletedAt)}
              savedLists={spaces.filter(s => !s.deletedAt)}
              commentToSpaces={commentToSpaces}
            />
          )}
        </div>
      </div>

      {connectingItem && (
        <SourcePickerModal
          sources={sources}
          title="Link to source"
          onSelect={handleConnectItemToSource}
          onClose={() => setConnectingItem(null)}
        />
      )}

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
                {spaces.filter(s => !s.deletedAt).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const target = spaces.find((sp) => sp.id === s.id)
                      const isDupe = target?.items.some((item) =>
                        item.type === 'note' && (
                          (noteForSpace.commentId && item.commentId === noteForSpace.commentId) ||
                          item.content === noteForSpace.content
                        )
                      )
                      if (isDupe && !window.confirm(`This note already exists in "${s.name}". Add anyway?`)) return
                      addNote(s.id, noteForSpace.content, { sourceRef: noteForSpace.sourceRef, commentId: noteForSpace.commentId })
                      setNoteForSpace(null)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 transition-colors text-black"
                  >
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
                      addNote(id, noteForSpace.content, { sourceRef: noteForSpace.sourceRef, commentId: noteForSpace.commentId })
                      setNoteForSpace(null)
                      setNoteForSpaceNewName('')
                    }
                  }}
                  placeholder="New space name…"
                  className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                />
                <button
                  onClick={() => {
                    if (!noteForSpaceNewName.trim()) return
                    const id = createSpace(noteForSpaceNewName.trim())
                    addNote(id, noteForSpace.content, { sourceRef: noteForSpace.sourceRef, commentId: noteForSpace.commentId })
                    setNoteForSpace(null)
                    setNoteForSpaceNewName('')
                  }}
                  disabled={!noteForSpaceNewName.trim()}
                  className="text-xs bg-black text-white px-2 py-1.5 hover:bg-black/80 transition-colors disabled:opacity-30 flex items-center"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {addLinkOpen && (
        <AddLinkPanel
          feedId="remix"
          onAdd={handleLinkAdd}
          onClose={() => { setAddLinkOpen(false); setAddLinkSpaceId(null) }}
        />
      )}
    </main>
  )
}

export default function RemixPage() {
  return (
    <Suspense fallback={null}>
      <RemixPageInner />
    </Suspense>
  )
}
