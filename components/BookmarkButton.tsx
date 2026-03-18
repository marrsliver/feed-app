'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useSavedLists } from '@/hooks/useSavedLists'
import { ListPickerDropdown } from './ListPickerDropdown'
import type { Post } from '@/lib/types'

interface Props {
  post: Post
  onAdded?: (post: Post) => void
}

export function BookmarkButton({ post, onAdded }: Props) {
  const { isInAnyList } = useSavedLists()
  const [open, setOpen] = useState(false)
  const saved = isInAnyList(post.id)

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        aria-label="Save to list"
        className="p-1.5 bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
      >
        <Bookmark
          size={16}
          className={saved ? 'fill-black text-black' : 'text-black/30'}
        />
      </button>
      {open && <ListPickerDropdown post={post} onClose={() => setOpen(false)} onAdded={onAdded} />}
    </div>
  )
}
