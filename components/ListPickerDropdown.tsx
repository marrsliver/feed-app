'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useSavedLists } from '@/hooks/useSavedLists'

interface Props {
  postId: string
  onClose: () => void
}

export function ListPickerDropdown({ postId, onClose }: Props) {
  const { lists, createList, togglePostInList, isInList } = useSavedLists()
  const [newName, setNewName] = useState('')
  const [showInput, setShowInput] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const id = createList(trimmed)
    togglePostInList(id, postId)
    setNewName('')
    setShowInput(false)
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-sm"
    >
      {lists.length === 0 && !showInput && (
        <p className="px-3 py-2 text-gray-400 text-xs">No lists yet</p>
      )}
      {lists.map((list) => {
        const checked = isInList(list.id, postId)
        return (
          <button
            key={list.id}
            onClick={() => togglePostInList(list.id, postId)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
              }`}
            >
              {checked && <Check size={10} className="text-white" strokeWidth={3} />}
            </span>
            <span className="truncate text-gray-700">{list.name}</span>
          </button>
        )
      })}
      <div className="border-t border-gray-100 mt-1 pt-1">
        {showInput ? (
          <div className="px-3 py-1.5 flex gap-1">
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setShowInput(false); setNewName('') }
              }}
              placeholder="List name…"
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-400"
            />
            <button
              onClick={handleCreate}
              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-indigo-600"
          >
            <Plus size={14} />
            <span>New list</span>
          </button>
        )}
      </div>
    </div>
  )
}
