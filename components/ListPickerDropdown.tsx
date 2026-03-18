'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useSavedLists } from '@/hooks/useSavedLists'
import type { Post } from '@/lib/types'

interface Props {
  post: Post
  onClose: () => void
  onAdded?: (post: Post) => void
}

export function ListPickerDropdown({ post, onClose, onAdded }: Props) {
  const postId = post.id
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
    togglePostInList(id, postId, post)
    onAdded?.(post)
    setNewName('')
    setShowInput(false)
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white shadow-lg border border-black/15 py-1 text-sm"
    >
      {lists.length === 0 && !showInput && (
        <p className="px-3 py-2 text-black/25 text-xs">No spaces yet</p>
      )}
      {lists.map((list) => {
        const checked = isInList(list.id, postId)
        return (
          <button
            key={list.id}
            onClick={() => {
            const wasChecked = isInList(list.id, postId)
            togglePostInList(list.id, postId, post)
            if (!wasChecked) onAdded?.(post)
          }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 text-left"
          >
            <span
              className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                checked ? 'bg-black border-black' : 'border-black/25'
              }`}
            >
              {checked && <Check size={10} className="text-white" strokeWidth={3} />}
            </span>
            <span className="truncate text-black/70">{list.name}</span>
          </button>
        )
      })}
      <div className="border-t border-black/8 mt-1 pt-1">
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
              placeholder="Space name…"
              className="flex-1 text-xs border border-black/15 px-2 py-1 outline-none focus:border-black/40 transition-colors"
            />
            <button
              onClick={handleCreate}
              className="text-xs bg-black text-white px-2 py-1 hover:bg-black/80 transition-colors"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 text-black/40 hover:text-black transition-colors"
          >
            <Plus size={14} />
            <span>New space</span>
          </button>
        )}
      </div>
    </div>
  )
}
