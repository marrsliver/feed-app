'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus, MoreHorizontal, Check } from 'lucide-react'
import type { Space } from '@/lib/types'

interface Props {
  lists: Space[]
  view: string
  onSetView: (id: string) => void
  onClose: () => void
  onCreate: (name: string) => string
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

function ListRow({
  list,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  list: Space
  active: boolean
  onSelect: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(list.name)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed) onRename(list.id, trimmed)
    else setDraft(list.name)
    setRenaming(false)
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
        active ? 'bg-black text-white' : 'hover:bg-black/5 text-black'
      }`}
      onClick={onSelect}
    >
      <div
        className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
          active ? 'bg-white border-white' : 'border-black/20'
        }`}
      >
        {active && <Check size={10} className="text-black" strokeWidth={3} />}
      </div>

      {renaming ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setDraft(list.name); setRenaming(false) }
          }}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm border border-black/40 px-1.5 py-0.5 outline-none focus:border-black/60 transition-colors"
        />
      ) : (
        <span className="flex-1 text-sm font-medium truncate">{list.name}</span>
      )}

      <span className={`text-xs shrink-0 ${active ? 'text-white/50' : 'text-black/30'}`}>
        {list.items.length}
      </span>

      {/* ··· menu */}
      <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 transition-opacity"
          aria-label="List options"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-md text-xs py-0.5 min-w-[110px]">
            <button
              onClick={() => { setMenuOpen(false); setRenaming(true) }}
              className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors"
            >
              Rename
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete(list.id) }}
              className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors text-red-500"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ListsSidebar({ lists, view, onSetView, onClose, onCreate, onRename, onDelete }: Props) {
  const [newName, setNewName] = useState('')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  function handleCreate() {
    const trimmed = newName.trim()
    if (trimmed) {
      const id = onCreate(trimmed)
      onSetView(id)
    }
    setNewName('')
    setShowInput(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-72 z-50 bg-white shadow-xl flex flex-col animate-slide-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
          <h2 className="text-sm font-semibold text-black">My Spaces</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {/* All */}
          <div
            className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
              view === 'all' ? 'bg-black text-white' : 'hover:bg-black/5 text-black'
            }`}
            onClick={() => { onSetView('all'); onClose() }}
          >
            <div
              className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                view === 'all' ? 'bg-white border-white' : 'border-black/20'
              }`}
            >
              {view === 'all' && <Check size={10} className="text-black" strokeWidth={3} />}
            </div>
            <span className="flex-1 text-sm font-medium">All posts</span>
          </div>

          {lists.map((list) => (
            <ListRow
              key={list.id}
              list={list}
              active={view === list.id}
              onSelect={() => { onSetView(list.id); onClose() }}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>

        {/* New list */}
        <div className="px-4 py-3 border-t border-black/10">
          {showInput ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setShowInput(false); setNewName('') }
                }}
                placeholder="Space name…"
                className="flex-1 text-sm border border-black/20 px-3 py-1.5 outline-none focus:border-black/50 transition-colors"
              />
              <button
                onClick={handleCreate}
                className="text-xs font-medium bg-black text-white px-3 py-1.5 hover:bg-black/80 transition-colors"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-black/50 hover:text-black hover:bg-black/5 transition-colors"
            >
              <Plus size={15} />
              New space
            </button>
          )}
        </div>
      </div>
    </>
  )
}
