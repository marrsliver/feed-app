'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, MoreHorizontal, ChevronRight, ChevronDown, GitBranch, Folder, FolderOpen, RotateCcw, Trash2 } from 'lucide-react'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Space, SpaceFolder } from '@/lib/types'
import type { SidebarEntry } from '@/hooks/useSpaceFolders'

// ── SortableRow — generic sortable wrapper for sidebar items ─────────────────

export function SortableRow({ id, children }: {
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

export function SpaceRow({
  space, active, onSelect, onRename, onDelete, folders, onMoveToFolder, onRemoveFromFolder, currentFolderId, dragListeners, onConvertToSource,
}: {
  space: Space; active: boolean
  onSelect: () => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void
  folders: SpaceFolder[]
  onMoveToFolder: (folderId: string) => void
  onRemoveFromFolder: () => void
  currentFolderId: string | null
  dragListeners?: React.HTMLAttributes<HTMLElement>
  onConvertToSource?: () => void
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
                {onConvertToSource && (
                  <button onClick={() => { setMenuOpen(false); onConvertToSource() }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 transition-colors text-black/60">
                    <GitBranch size={11} />Convert to Source
                  </button>
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

export function FolderRow({
  folder, spaces, activeSpaceId, onSelectSpace, onRenameSpace, onDeleteSpace, onRenameFolder, onDeleteFolder,
  onDeleteFolderWithContents, allFolders, onMoveToFolder, onRemoveFromFolder, getFolderForSpace, autoRename, dragListeners, onConvertToSource,
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
  onConvertToSource?: (spaceId: string) => void
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
            onConvertToSource={onConvertToSource ? () => onConvertToSource(space.id) : undefined}
          />
        </div>
      ))}
    </div>
  )
}

// ── Folder trash bin (left panel) ────────────────────────────────────────────

export function FolderTrashBin({
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

export function TrashBin({
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

// Re-export SidebarEntry type for consumers that need it
export type { SidebarEntry }
