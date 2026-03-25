'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  FileText, Link2, Database, Image as ImageIcon, Minus, GripVertical,
  GitBranch, ExternalLink, Info, Layers,
} from 'lucide-react'
import { NoteItemCard } from '@/components/NoteItemCard'
import { SourceItemCard } from '@/components/SourceItemCard'
import { NestedSpaceCard } from '@/components/NestedSpaceCard'
import { MediaItemCard } from '@/components/MediaItemCard'
import { SourcePickerModal } from '@/components/SourcePickerModal'
import { TextItemCard, DividerItemCard, PostItemWrapper } from '@/components/remix/SpaceItemCards'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useComments } from '@/hooks/useComments'
import { pushUndo } from '@/lib/undoStack'
import type { SpaceItem, LibrarySource, Post, Space } from '@/lib/types'

// ── SortableItem wrapper (source-spaces variant — no MoveCopyMenu) ────────────

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

// ── SourceRow (sidebar list item) ─────────────────────────────────────────────

export function SourceRow({ source, active, onClick }: {
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

export function AppearsInSourcesBadge({ sources }: { sources: LibrarySource[] }) {
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

export function SourceSpaceWorkspace({
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
          onOpenSource={() => onOpenSourcePanel()}
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
          onOpenSource={() => { /* opens the source panel for that source if needed */ }}
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
          onOpenSource={() => onOpenSourcePanel()}
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
