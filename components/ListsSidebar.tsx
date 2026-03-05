'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus, MoreHorizontal, Check } from 'lucide-react'
import type { SavedList } from '@/lib/types'

interface Props {
  lists: SavedList[]
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
  list: SavedList
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
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
      }`}
      onClick={onSelect}
    >
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
          active ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
        }`}
      >
        {active && <Check size={10} className="text-white" strokeWidth={3} />}
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
          className="flex-1 text-sm border border-indigo-400 rounded px-1.5 py-0.5 outline-none"
        />
      ) : (
        <span className="flex-1 text-sm font-medium truncate">{list.name}</span>
      )}

      <span className={`text-xs shrink-0 ${active ? 'text-indigo-400' : 'text-gray-400'}`}>
        {list.postIds.length}
      </span>

      {/* ··· menu */}
      <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity"
          aria-label="List options"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg text-xs py-1 min-w-[110px]">
            <button
              onClick={() => { setMenuOpen(false); setRenaming(true) }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
            >
              Rename
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete(list.id) }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-500"
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
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-72 z-50 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">My Lists</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {/* All */}
          <div
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              view === 'all' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
            }`}
            onClick={() => { onSetView('all'); onClose() }}
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                view === 'all' ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
              }`}
            >
              {view === 'all' && <Check size={10} className="text-white" strokeWidth={3} />}
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
        <div className="px-4 py-3 border-t border-gray-100">
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
                placeholder="List name…"
                className="flex-1 text-sm border border-indigo-400 rounded-lg px-3 py-1.5 outline-none"
              />
              <button
                onClick={handleCreate}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
            >
              <Plus size={15} />
              New list
            </button>
          )}
        </div>
      </div>
    </>
  )
}
