'use client'

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, Check, FileText, Link2, Database, Layers, Search, Loader2, GripVertical, Image as ImageIcon, X, MoveRight, Copy, Tag, ArrowDownUp, Trash2, RotateCcw, Pencil, Minus, FolderOpen, Folder, ChevronRight, ChevronDown } from 'lucide-react'
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
import { useSpaceFolders } from '@/hooks/useSpaceFolders'
import type { SidebarEntry } from '@/hooks/useSpaceFolders'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useSourceCategories } from '@/hooks/useSourceCategories'
import { useSourceIndustries } from '@/hooks/useSourceIndustries'
import { useComments } from '@/hooks/useComments'
import { pushUndo } from '@/lib/undoStack'
import type { Space, SpaceItem, SpaceItemVersion, Post, LibrarySource, SpaceFolder } from '@/lib/types'

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

// ── SortableRow — generic sortable wrapper for sidebar items ─────────────────

function SortableRow({ id, children }: {
  id: string
  children: (isDragging: boolean, listeners: React.HTMLAttributes<HTMLElement>) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {children(isDragging, listeners ?? {})}
    </div>
  )
}

// ── SpaceRow (left panel) ────────────────────────────────────────────────────

function SpaceRow({
  space, active, onSelect, onRename, onDelete, folders, onMoveToFolder, onRemoveFromFolder, currentFolderId, dragListeners,
}: {
  space: Space; active: boolean
  onSelect: () => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void
  folders: SpaceFolder[]
  onMoveToFolder: (folderId: string) => void
  onRemoveFromFolder: () => void
  currentFolderId: string | null
  dragListeners?: React.HTMLAttributes<HTMLElement>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMode, setMenuMode] = useState<'main' | 'folder'>('main')
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(space.name)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) { setMenuMode('main'); return }
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
      className={`group flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors ${active ? 'bg-black text-white' : 'hover:bg-black/5 text-black'}`}
      onClick={onSelect}
      onDoubleClick={() => setRenaming(true)}
      {...dragListeners}
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
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-0.5 min-w-[130px]">
            {menuMode === 'main' ? (
              <>
                <button onClick={() => { setMenuOpen(false); setRenaming(true) }} className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors text-black">Rename</button>
                {folders.length > 0 && (
                  <button onClick={() => setMenuMode('folder')} className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 transition-colors text-black">
                    <span>{currentFolderId ? 'Move folder' : 'Add to folder'}</span>
                    <ChevronRight size={10} className="text-black/30" />
                  </button>
                )}
                {currentFolderId && (
                  <button onClick={() => { setMenuOpen(false); onRemoveFromFolder() }} className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors text-black/50">Remove from folder</button>
                )}
                <button onClick={() => { setMenuOpen(false); onDelete(space.id) }} className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors text-red-500">Delete</button>
              </>
            ) : (
              <>
                <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-black/30 font-semibold border-b border-black/8">Move to folder</div>
                {folders.map(f => (
                  <button key={f.id} onClick={() => { setMenuOpen(false); onMoveToFolder(f.id) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 transition-colors ${f.id === currentFolderId ? 'text-black font-medium' : 'text-black/70'}`}>
                    <Folder size={10} className="text-black/30 shrink-0" />
                    <span className="truncate">{f.name}</span>
                    {f.id === currentFolderId && <Check size={9} className="shrink-0 ml-auto" />}
                  </button>
                ))}
                <button onClick={() => setMenuMode('main')} className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors text-black/40 border-t border-black/8">← Back</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── FolderRow ────────────────────────────────────────────────────────────────

function FolderRow({
  folder, spaces, activeSpaceId, onSelectSpace, onRenameSpace, onDeleteSpace, onRenameFolder, onDeleteFolder,
  onDeleteFolderWithContents, allFolders, onMoveToFolder, onRemoveFromFolder, getFolderForSpace, autoRename, dragListeners,
}: {
  folder: SpaceFolder
  spaces: Space[]
  activeSpaceId: string | null
  onSelectSpace: (id: string) => void
  onRenameSpace: (id: string, name: string) => void
  onDeleteSpace: (id: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onDeleteFolderWithContents: (id: string) => void
  allFolders: SpaceFolder[]
  onMoveToFolder: (spaceId: string, folderId: string) => void
  onRemoveFromFolder: (spaceId: string) => void
  getFolderForSpace: (spaceId: string) => string | null
  autoRename?: boolean
  dragListeners?: React.HTMLAttributes<HTMLElement>
}) {
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<null | 'folder' | 'contents'>(null)
  const [draft, setDraft] = useState(folder.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) { setConfirmDelete(null); return }
    function h(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  useEffect(() => { if (autoRename) setRenaming(true) }, [autoRename])
  useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])

  function commitRename() {
    const t = draft.trim()
    if (t && t !== folder.name) onRenameFolder(folder.id, t)
    else setDraft(folder.name)
    setRenaming(false)
  }

  return (
    <div>
      {/* Folder header — entire row is draggable */}
      <div className="group flex items-center gap-1.5 px-3 py-2 hover:bg-black/3 transition-colors cursor-grab active:cursor-grabbing" {...dragListeners}>
        <button onClick={() => setOpen(p => !p)} className="flex items-center gap-1.5 flex-1 min-w-0" onPointerDown={(e) => e.stopPropagation()}>
          {open ? <ChevronDown size={11} className="text-black/30 shrink-0" /> : <ChevronRight size={11} className="text-black/30 shrink-0" />}
          {open ? <FolderOpen size={12} className="text-black/40 shrink-0" /> : <Folder size={12} className="text-black/40 shrink-0" />}
          {renaming ? (
            <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setDraft(folder.name); setRenaming(false) } }}
              onBlur={commitRename} onClick={(e) => e.stopPropagation()}
              className="flex-1 text-xs border border-black/30 px-1 py-0.5 outline-none focus:border-black/50 bg-white text-black"
            />
          ) : (
            <span className="text-xs font-medium text-black/60 truncate">{folder.name}</span>
          )}
          <span className="text-[9px] text-black/25 ml-auto shrink-0 pr-1">{spaces.length}</span>
        </button>
        <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(p => !p)} className="opacity-0 group-hover:opacity-100 p-0.5 text-black/30 hover:text-black transition-colors">
            <MoreHorizontal size={12} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-0.5 min-w-[170px]">
              <button onClick={() => { setMenuOpen(false); setRenaming(true) }} className="w-full text-left px-3 py-2 hover:bg-black/5 text-black">Rename</button>
              {confirmDelete === 'folder' ? (
                <div className="px-3 py-2 border-t border-black/8 space-y-1.5">
                  <p className="text-[10px] text-black/50">Delete folder? Spaces inside will be kept.</p>
                  <div className="flex gap-2">
                    <button onClick={() => { onDeleteFolder(folder.id); setMenuOpen(false) }} className="text-[10px] text-red-500 font-medium">Yes, delete</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-black/40">Cancel</button>
                  </div>
                </div>
              ) : confirmDelete === 'contents' ? (
                <div className="px-3 py-2 border-t border-black/8 space-y-1.5">
                  <p className="text-[10px] text-black/50">Delete folder and all {spaces.length} space{spaces.length !== 1 ? 's' : ''} inside?</p>
                  <div className="flex gap-2">
                    <button onClick={() => { onDeleteFolderWithContents(folder.id); setMenuOpen(false) }} className="text-[10px] text-red-500 font-medium">Yes, delete all</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-black/40">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-black/8">
                  <button onClick={() => setConfirmDelete('folder')} className="w-full text-left px-3 py-2 hover:bg-black/5 text-red-500">Delete folder</button>
                  {spaces.length > 0 && (
                    <button onClick={() => setConfirmDelete('contents')} className="w-full text-left px-3 py-2 hover:bg-black/5 text-red-500">Delete folder + contents</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Spaces in this folder */}
      {open && spaces.map((space) => (
        <div key={space.id} className="pl-5">
          <SpaceRow
            space={space}
            active={activeSpaceId === space.id}
            onSelect={() => onSelectSpace(space.id)}
            onRename={onRenameSpace}
            onDelete={onDeleteSpace}
            folders={allFolders}
            onMoveToFolder={(folderId) => onMoveToFolder(space.id, folderId)}
            onRemoveFromFolder={() => onRemoveFromFolder(space.id)}
            currentFolderId={getFolderForSpace(space.id)}
          />
        </div>
      ))}
    </div>
  )
}

// ── AttachedNoteRow — editable note inside a merged card ─────────────────────

function AttachedNoteRow({ note, onRemove, onDelete, onUpdate }: {
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

function MergedArticleNoteCard({ item, attachedNotes, sources, onRemovePost, onDeletePost, onRemoveNote, onUpdateNote, onOpenPost, onOpenSource, onConnectToSource, onUnlinkSource }: {
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

function PostItemWrapper({
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

// ── SpaceWorkspace ────────────────────────────────────────────────────────────

function SpaceWorkspace({
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

// ── Folder trash bin (left panel) ────────────────────────────────────────────

function FolderTrashBin({
  folders, onRestore, onPermanentDelete,
}: {
  folders: SpaceFolder[]
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
        <Folder size={11} />
        <span>Folder trash ({folders.length})</span>
        <span className="ml-auto">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="pb-1">
          {folders.map((f) => (
            <div key={f.id} className="group flex items-center gap-2 px-3 py-2 hover:bg-black/3 transition-colors">
              <span className="flex-1 text-xs text-black/40 truncate">{f.name}</span>
              {confirmId === f.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-black/40">Delete forever?</span>
                  <button onClick={() => { onPermanentDelete(f.id); setConfirmId(null) }} className="text-[10px] text-red-500 font-medium px-1">Yes</button>
                  <button onClick={() => setConfirmId(null)} className="text-[10px] text-black/40 px-1">No</button>
                </div>
              ) : (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => onRestore(f.id)} className="text-[10px] text-black/40 hover:text-black flex items-center gap-0.5 px-1">
                    <RotateCcw size={9} />Restore
                  </button>
                  <button onClick={() => setConfirmId(f.id)} className="text-[10px] text-red-400 hover:text-red-600 px-1">
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

  const { folders, trashedFolders, createFolder, renameFolder, deleteFolder, restoreFolder, permanentDeleteFolder, addSpaceToFolder, removeSpaceFromFolder, getFolderForSpace, reorderFolders, sidebarOrder, updateSidebarOrder } = useSpaceFolders()

  function deleteFolderWithContents(folderId: string) {
    const folder = folders.find(f => f.id === folderId)
    if (folder) {
      for (const spaceId of folder.spaceIds) {
        deleteSpace(spaceId)
        pushUndo({ label: 'Delete space', undo: () => restoreSpace(spaceId) })
      }
    }
    deleteFolder(folderId)
  }
  const [newFolderId, setNewFolderId] = useState<string | null>(null)
  useEffect(() => { if (newFolderId) { const t = setTimeout(() => setNewFolderId(null), 500); return () => clearTimeout(t) } }, [newFolderId])
  const { sources, setCategory, setIndustry, addTag, removeTag, renameSource, allTags, addSourceCard, removeSourceCard, addAssociation, removeAssociation } = useLibrarySources()
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

  // Sidebar DnD for reordering folders + uncategorized spaces together
  const sidebarSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Build effective ordered sidebar list (folders + uncategorized spaces interleaved)
  const buildSidebarItems = useCallback((
    currentFolders: typeof folders,
    currentSpaces: typeof filteredSpaces,
    order: SidebarEntry[]
  ): SidebarEntry[] => {
    const folderIds = new Set(currentFolders.map(f => f.id))
    const uncatIds = new Set(currentSpaces.filter(s => !getFolderForSpace(s.id) && !s.deletedAt).map(s => s.id))
    // Filter stored order to existing items
    const ordered = order.filter(e =>
      (e.type === 'folder' && folderIds.has(e.id)) ||
      (e.type === 'space' && uncatIds.has(e.id))
    )
    const orderedIdSet = new Set(ordered.map(e => e.id))
    // Append any new items not in stored order
    for (const f of currentFolders) {
      if (!orderedIdSet.has(f.id)) { ordered.push({ type: 'folder', id: f.id }); orderedIdSet.add(f.id) }
    }
    for (const s of currentSpaces) {
      if (!s.deletedAt && uncatIds.has(s.id) && !orderedIdSet.has(s.id)) { ordered.push({ type: 'space', id: s.id }); orderedIdSet.add(s.id) }
    }
    return ordered
  }, [getFolderForSpace]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSidebarDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const currentItems = buildSidebarItems(folders, filteredSpaces, sidebarOrder)
    const oldIdx = currentItems.findIndex(i => i.id === active.id)
    const newIdx = currentItems.findIndex(i => i.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(currentItems, oldIdx, newIdx)
    updateSidebarOrder(reordered)
    // Also update folder order to match
    const newFolderOrder = reordered.filter(e => e.type === 'folder').map(e => e.id)
    reorderFolders(newFolderOrder)
  }

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
              <button onClick={() => { const id = createFolder('New folder'); setNewFolderId(id) }} className="text-black/30 hover:text-black transition-colors p-0.5" title="New folder">
                <Folder size={13} />
              </button>
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
            ) : searchQuery ? (
              // Flat list when searching
              filteredSpaces.map((space) => (
                <SpaceRow
                  key={space.id}
                  space={space}
                  active={selectedSpaceId === space.id}
                  onSelect={() => setSelectedSpaceId(space.id)}
                  onRename={renameSpace}
                  onDelete={(id) => { deleteSpace(id); pushUndo({ label: 'Delete space', undo: () => restoreSpace(id) }); if (selectedSpaceId === id) setSelectedSpaceId(null) }}
                  folders={folders}
                  onMoveToFolder={(folderId) => addSpaceToFolder(folderId, space.id)}
                  onRemoveFromFolder={() => removeSpaceFromFolder(getFolderForSpace(space.id) ?? '', space.id)}
                  currentFolderId={getFolderForSpace(space.id)}
                />
              ))
            ) : (() => {
              // Combined folder+space ordered view
              const sidebarItems = buildSidebarItems(folders, filteredSpaces, sidebarOrder)
              const folderMap = Object.fromEntries(folders.map(f => [f.id, f]))
              const spaceMap2 = Object.fromEntries(filteredSpaces.map(s => [s.id, s]))
              return (
                <DndContext sensors={sidebarSensors} collisionDetection={closestCenter} onDragEnd={handleSidebarDragEnd}>
                  <SortableContext items={sidebarItems.map(i => i.id)} strategy={rectSortingStrategy}>
                    {sidebarItems.map((entry) => {
                      if (entry.type === 'folder') {
                        const folder = folderMap[entry.id]
                        if (!folder) return null
                        const folderSpaces = folder.spaceIds
                          .map(id => filteredSpaces.find(s => s.id === id))
                          .filter(Boolean) as Space[]
                        return (
                          <SortableRow key={folder.id} id={folder.id}>
                            {(_isDragging, listeners) => (
                              <FolderRow
                                folder={folder}
                                spaces={folderSpaces}
                                activeSpaceId={selectedSpaceId}
                                onSelectSpace={setSelectedSpaceId}
                                onRenameSpace={renameSpace}
                                onDeleteSpace={(id) => { deleteSpace(id); pushUndo({ label: 'Delete space', undo: () => restoreSpace(id) }); if (selectedSpaceId === id) setSelectedSpaceId(null) }}
                                onRenameFolder={renameFolder}
                                onDeleteFolder={deleteFolder}
                                onDeleteFolderWithContents={deleteFolderWithContents}
                                allFolders={folders}
                                onMoveToFolder={(spaceId, folderId) => addSpaceToFolder(folderId, spaceId)}
                                onRemoveFromFolder={(spaceId) => removeSpaceFromFolder(folder.id, spaceId)}
                                getFolderForSpace={getFolderForSpace}
                                autoRename={newFolderId === folder.id}
                                dragListeners={listeners}
                              />
                            )}
                          </SortableRow>
                        )
                      }
                      // type === 'space' (uncategorized)
                      const space = spaceMap2[entry.id]
                      if (!space || space.deletedAt) return null
                      return (
                        <SortableRow key={space.id} id={space.id}>
                          {(_isDragging, listeners) => (
                            <SpaceRow
                              space={space}
                              active={selectedSpaceId === space.id}
                              onSelect={() => setSelectedSpaceId(space.id)}
                              onRename={renameSpace}
                              onDelete={(id) => { deleteSpace(id); pushUndo({ label: 'Delete space', undo: () => restoreSpace(id) }); if (selectedSpaceId === id) setSelectedSpaceId(null) }}
                              folders={folders}
                              onMoveToFolder={(folderId) => addSpaceToFolder(folderId, space.id)}
                              onRemoveFromFolder={() => removeSpaceFromFolder(getFolderForSpace(space.id) ?? '', space.id)}
                              currentFolderId={null}
                              dragListeners={listeners}
                            />
                          )}
                        </SortableRow>
                      )
                    })}
                  </SortableContext>
                </DndContext>
              )
            })()}
          </div>

          {/* Folder trash */}
          {trashedFolders.length > 0 && (
            <FolderTrashBin
              folders={trashedFolders}
              onRestore={restoreFolder}
              onPermanentDelete={permanentDeleteFolder}
            />
          )}

          {/* Space trash */}
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
                onAppendItem={appendItem}
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
              allLibrarySources={sources}
              onAddAssociation={(targetId) => addAssociation(openSourcePanel.id, targetId)}
              onRemoveAssociation={(targetId) => removeAssociation(openSourcePanel.id, targetId)}
              onOpenAssociation={(src) => openSourcePanelExclusive(src)}
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
