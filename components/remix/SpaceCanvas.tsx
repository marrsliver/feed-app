'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, Copy, FileText, Link2, Database, Layers, GripVertical, Image as ImageIcon, X, MoveRight, Tag, Minus } from 'lucide-react'
import { PostCard } from '@/components/PostCard'
import { NoteItemCard } from '@/components/NoteItemCard'
import { SourceItemCard } from '@/components/SourceItemCard'
import { NestedSpaceCard } from '@/components/NestedSpaceCard'
import { MediaItemCard } from '@/components/MediaItemCard'
import { SourcePickerModal } from '@/components/SourcePickerModal'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useComments } from '@/hooks/useComments'
import { pushUndo } from '@/lib/undoStack'
import type { Space, SpaceItem, Post, LibrarySource } from '@/lib/types'
import {
  AttachedNoteRow,
  MergedArticleNoteCard,
  TextItemCard,
  DividerItemCard,
  PostItemWrapper,
} from './SpaceItemCards'

// ── Appears-in badge ──────────────────────────────────────────────────────────

export function AppearsInBadge({
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

export function MoveCopyMenu({
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

export function SortableItem({
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
    gridColumn: item.type === 'divider' ? '1 / -1' : `span ${item.itemSpan ?? 1}`,
    gridRowEnd: rowSpan ? `span ${rowSpan}` : undefined,
    willChange: isDragging ? 'auto' : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group" data-space-item="true">
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

// ── SpaceWorkspace ────────────────────────────────────────────────────────────

export function SpaceWorkspace({
  space, allSpaces, onRename, onUpdateDescription,
  onAddNote, onAddSource, onNestSpace, onRemoveItem, onAppendItem, onReorderItems,
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
  onAppendItem: (spaceId: string, item: SpaceItem) => void
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
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const s of allSpaces) for (const t of (s.tags ?? [])) tagSet.add(t)
    return Array.from(tagSet).sort()
  }, [allSpaces])

  // Note input
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  // Canvas text items
  const [activeTextItemId, setActiveTextItemId] = useState<string | null>(null)
  const contentAreaRef = useRef<HTMLDivElement>(null)

  // Drag state for floating text items (local — persisted on pointer up)
  const [draggedText, setDraggedText] = useState<{ id: string; posX: number; posY: number } | null>(null)

  function handleTextDragStart(e: React.PointerEvent<HTMLElement>, item: SpaceItem) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX, startY = e.clientY
    const startPosX = item.posX ?? 24, startPosY = item.posY ?? 24
    setDraggedText({ id: item.id, posX: startPosX, posY: startPosY })
    function onMove(ev: PointerEvent) {
      setDraggedText({
        id: item.id,
        posX: Math.max(0, startPosX + ev.clientX - startX),
        posY: Math.max(0, startPosY + ev.clientY - startY),
      })
    }
    function onUp(ev: PointerEvent) {
      const newX = Math.max(0, startPosX + ev.clientX - startX)
      const newY = Math.max(0, startPosY + ev.clientY - startY)
      onUpdateItem(space.id, item.id, { posX: newX, posY: newY })
      setDraggedText(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

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
    const oldIndex = standaloneItems.findIndex((i) => i.id === active.id)
    const newIndex = standaloneItems.findIndex((i) => i.id === over.id)
    const reorderedStandalone = arrayMove(standaloneItems, oldIndex, newIndex)
    // Reconstruct full list: each standalone item followed by its attached notes
    const full = reorderedStandalone.flatMap(item => [item, ...(attachedNoteMap.get(item.id) ?? [])])
    setDisplayItems(full)
    onReorderItems(space.id, full)
  }

  const activeItem = activeId ? displayItems.find((i) => i.id === activeId) : null

  const sourceMap = useMemo(() => Object.fromEntries(sources.map((s) => [s.id, s])), [sources])
  const spaceMap = useMemo(() => Object.fromEntries(allSpaces.map((s) => [s.id, s])), [allSpaces])

  // Note-article grouping: notes with postRef whose article is also in this space
  const attachedNoteMap = useMemo(() => {
    const map = new Map<string, SpaceItem[]>()
    const postItemIdByPostDataId = new Map<string, string>()
    for (const item of displayItems) {
      if (item.type === 'post' && item.postData) postItemIdByPostDataId.set(item.postData.id, item.id)
    }
    for (const item of displayItems) {
      if (item.type === 'note' && item.postRef) {
        const postItemId = postItemIdByPostDataId.get(item.postRef.id)
        if (postItemId) {
          const existing = map.get(postItemId) ?? []
          map.set(postItemId, [...existing, item])
        }
      }
    }
    return map
  }, [displayItems])

  const attachedNoteIds = useMemo(() => {
    const ids = new Set<string>()
    for (const notes of attachedNoteMap.values()) for (const n of notes) ids.add(n.id)
    return ids
  }, [attachedNoteMap])

  const textItems = useMemo(
    () => displayItems.filter(item => item.type === 'text'),
    [displayItems]
  )

  const standaloneItems = useMemo(
    () => displayItems.filter(item => !attachedNoteIds.has(item.id) && item.type !== 'text'),
    [displayItems, attachedNoteIds]
  )

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
    const remove = () => {
      onRemoveItem(space.id, item.id)
      pushUndo({ label: 'Remove item', undo: () => onAppendItem(space.id, item) })
    }
    const deleteFromAll = () => {
      const appearsIn = getAppearsIn(item)
      onRemoveItem(space.id, item.id)
      for (const { id: spaceId } of appearsIn) {
        const s = allSpaces.find(sp => sp.id === spaceId)
        const gid = item.copyGroupId ?? item.id
        const matchingItem = s?.items.find(i => (i.copyGroupId ?? i.id) === gid)
        if (matchingItem) onRemoveItem(spaceId, matchingItem.id)
      }
      pushUndo({ label: 'Delete item', undo: () => onAppendItem(space.id, item) })
    }
    if (item.type === 'divider') {
      return <DividerItemCard item={item} onRemove={remove} onUpdate={(updates) => onUpdateItem(space.id, item.id, updates)} />
    }
    if (item.type === 'text') {
      return (
        <TextItemCard
          item={item}
          onRemove={remove}
          onUpdate={(updates) => onUpdateItem(space.id, item.id, updates)}
          onActivate={() => setActiveTextItemId(item.id)}
          onDeactivate={() => setActiveTextItemId((prev) => prev === item.id ? null : prev)}
        />
      )
    }
    if (item.type === 'post' && item.postData) {
      const attachedNotes = attachedNoteMap.get(item.id) ?? []
      const unlinkSource = item.sourceRef ? () => {
        const prev = { sourceRef: item.sourceRef, cardRef: item.cardRef }
        onUpdateItem(space.id, item.id, { sourceRef: undefined, cardRef: undefined })
        pushUndo({ label: 'Unlink source', undo: () => onUpdateItem(space.id, item.id, prev) })
      } : undefined

      if (attachedNotes.length > 0) {
        return (
          <MergedArticleNoteCard
            item={item}
            attachedNotes={attachedNotes}
            sources={sources}
            onRemovePost={remove}
            onDeletePost={deleteFromAll}
            onRemoveNote={(noteId) => {
              const note = attachedNotes.find((n) => n.id === noteId)
              onRemoveItem(space.id, noteId)
              if (note) pushUndo({ label: 'Remove note', undo: () => onAppendItem(space.id, note) })
            }}
            onUpdateNote={(noteId, updates) => onUpdateItem(space.id, noteId, updates)}
            onOpenPost={(post) => onOpenPostPanel(post, item)}
            onOpenSource={(s) => onOpenSourcePanel(s)}
            onConnectToSource={() => onConnectItemToSource(item)}
            onUnlinkSource={unlinkSource}
          />
        )
      }

      return (
        <PostItemWrapper
          item={item}
          sources={sources}
          onRemove={remove}
          onDelete={deleteFromAll}
          onOpenSource={(s) => onOpenSourcePanel(s)}
          onOpenPost={(post) => onOpenPostPanel(post, item)}
          onAddNoteToSpace={(content) => onAddNote(space.id, content, { postRef: item.postData, sourceRef: item.postData?.sourceId })}
          onConnectToSource={() => onConnectItemToSource(item)}
          onUnlinkSource={unlinkSource}
        />
      )
    }
    if (item.type === 'note') {
      const connectedSource = item.sourceRef ? sourceMap[item.sourceRef] : undefined
      return (
        <NoteItemCard
          item={item}
          onRemove={remove}
          onDelete={deleteFromAll}
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
          onDelete={deleteFromAll}
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
          onDelete={deleteFromAll}
        />
      )
    }
    if (item.type === 'media') {
      return <MediaItemCard item={item} onRemove={remove} onDelete={deleteFromAll} />
    }
    return null
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    // Skip if clicked inside a card, header area, toolbar, or interactive element
    if (target.closest('[data-space-item]')) return
    if (target.closest('[data-no-canvas]')) return
    if (target.closest('button, input, textarea, a, [role="button"]')) return
    if (activeTextItemId) return
    if (!contentAreaRef.current) return
    const rect = contentAreaRef.current.getBoundingClientRect()
    const posX = Math.max(0, e.clientX - rect.left)
    const posY = Math.max(0, e.clientY - rect.top)
    const id = `${Date.now()}-text`
    onAppendItem(space.id, { id, type: 'text', content: '', addedAt: Date.now(), posX, posY })
    setActiveTextItemId(id)
  }

  return (
    <div ref={contentAreaRef} className="p-6 max-w-5xl min-h-full relative" onClick={handleCanvasClick}>
      {/* Space header */}
      <div className="mb-6 space-y-2" data-no-canvas="true">
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
          <div className="relative">
            <input
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onFocus={() => setTagDropdownOpen(true)}
              onBlur={() => setTimeout(() => setTagDropdownOpen(false), 150)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                  e.preventDefault()
                  const tag = tagInput.trim().replace(/,$/, '')
                  if (tag && !(space.tags ?? []).includes(tag)) onUpdateTags(space.id, [...(space.tags ?? []), tag])
                  setTagInput('')
                  setTagDropdownOpen(false)
                }
                if (e.key === 'Backspace' && !tagInput && (space.tags ?? []).length > 0) {
                  onUpdateTags(space.id, (space.tags ?? []).slice(0, -1))
                }
                if (e.key === 'Escape') { setTagDropdownOpen(false); tagInputRef.current?.blur() }
              }}
              placeholder={(space.tags ?? []).length === 0 ? '+ Add tag…' : '+ tag'}
              className="text-[10px] text-black/40 outline-none bg-transparent placeholder:text-black/20 min-w-[60px] w-auto"
            />
            {tagDropdownOpen && (() => {
              const filtered = allExistingTags.filter(t =>
                !(space.tags ?? []).includes(t) &&
                (tagInput === '' || t.toLowerCase().includes(tagInput.toLowerCase()))
              )
              const canCreate = tagInput.trim() && !(space.tags ?? []).includes(tagInput.trim())
              return (filtered.length > 0 || canCreate) ? (
                <div className="absolute top-full left-0 z-50 bg-white border border-black/15 shadow-md py-0.5 min-w-[140px] max-h-40 overflow-y-auto">
                  {filtered.map(tag => (
                    <button
                      key={tag}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        onUpdateTags(space.id, [...(space.tags ?? []), tag])
                        setTagInput('')
                        setTagDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-black/60 hover:bg-black/5 hover:text-black transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                  {canCreate && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault()
                        onUpdateTags(space.id, [...(space.tags ?? []), tagInput.trim()])
                        setTagInput('')
                        setTagDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-black/50 hover:bg-black/5 hover:text-black transition-colors border-t border-black/8 flex items-center gap-1"
                    >
                      <Plus size={9} />Create &ldquo;{tagInput.trim()}&rdquo;
                    </button>
                  )}
                </div>
              ) : null
            })()}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap" data-no-canvas="true">
        {[
          { label: 'Note', icon: <FileText size={12} />, onClick: () => setAddingNote(true) },
          { label: 'Link', icon: <Link2 size={12} />, onClick: onAddLink },
          { label: uploading ? 'Uploading…' : 'Media', icon: <ImageIcon size={12} />, onClick: () => mediaInputRef.current?.click(), disabled: uploading },
          { label: 'Divider', icon: <Minus size={12} />, onClick: () => onAppendItem(space.id, { id: `${Date.now()}-div`, type: 'divider', addedAt: Date.now() }) },
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

      {/* Content grid with DnD */}
      {standaloneItems.length === 0 && textItems.length === 0 && !addingNote ? (
        <div className="text-center py-20 text-black/25 text-sm space-y-2 select-none pointer-events-none">
          <p>This space is empty.</p>
          <p className="text-[10px]">Click anywhere to start typing, or use the toolbar above.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={standaloneItems.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-x-4 gap-y-0" style={{ gridAutoRows: '4px', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {standaloneItems.map((item) => (
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

      {/* Absolutely positioned floating text items */}
      {textItems.map((item) => {
        const remove = () => {
          onRemoveItem(space.id, item.id)
          pushUndo({ label: 'Remove item', undo: () => onAppendItem(space.id, item) })
        }
        const isDragging = draggedText?.id === item.id
        const posX = isDragging ? draggedText!.posX : (item.posX ?? 24)
        const posY = isDragging ? draggedText!.posY : (item.posY ?? 24)
        return (
          <div
            key={item.id}
            className="group/text-float"
            style={{ position: 'absolute', left: posX, top: posY, minWidth: 160, maxWidth: 360, zIndex: isDragging ? 20 : 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — appears on hover, sits above the card */}
            <div
              onPointerDown={(e) => handleTextDragStart(e, item)}
              className="absolute -top-4 left-0 right-0 flex justify-center opacity-0 group-hover/text-float:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
              title="Drag to move"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={12} className="text-black/30 hover:text-black/60 transition-colors rotate-90" />
            </div>
            <TextItemCard
              item={item}
              onRemove={remove}
              onUpdate={(updates) => onUpdateItem(space.id, item.id, updates)}
              onActivate={() => setActiveTextItemId(item.id)}
              onDeactivate={() => setActiveTextItemId((prev) => prev === item.id ? null : prev)}
            />
          </div>
        )
      })}

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
