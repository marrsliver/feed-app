'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useSavedLists } from '@/hooks/useSavedLists'
import { ListPickerDropdown } from './ListPickerDropdown'

interface Props {
  postId: string
}

export function BookmarkButton({ postId }: Props) {
  const { isInAnyList } = useSavedLists()
  const [open, setOpen] = useState(false)
  const saved = isInAnyList(postId)

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        aria-label="Save to list"
        className="p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow"
      >
        <Bookmark
          size={16}
          className={saved ? 'fill-indigo-600 text-indigo-600' : 'text-gray-500'}
        />
      </button>
      {open && <ListPickerDropdown postId={postId} onClose={() => setOpen(false)} />}
    </div>
  )
}
