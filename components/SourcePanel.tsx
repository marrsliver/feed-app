'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ArrowUpRight, Pencil, Check, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { useComments } from '@/hooks/useComments'
import type { LibrarySource, SourceCategory, SourceList, Post, SavedList } from '@/lib/types'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function NoteRow({
  text,
  createdAt,
  onEdit,
  onDelete,
}: {
  text: string
  createdAt: number
  onEdit: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commit() {
    if (draft.trim()) onEdit(draft)
    else setDraft(text)
    setEditing(false)
  }

  return (
    <div className="group flex gap-3">
      <div className="flex-1 space-y-0.5">
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
              if (e.key === 'Escape') { setDraft(text); setEditing(false) }
            }}
            onBlur={commit}
            rows={2}
            className="w-full text-sm border border-black/20 px-2 py-1.5 resize-none outline-none focus:border-black/40 transition-colors"
          />
        ) : (
          <p className="text-sm text-black leading-relaxed">{text}</p>
        )}
        <p className="text-[9px] text-black/25 tracking-widest uppercase">
          {formatTime(createdAt)}
        </p>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {editing ? (
          <button onClick={commit} className="p-1 text-black/40 hover:text-black transition-colors" aria-label="Save">
            <Check size={12} />
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="p-1 text-black/20 hover:text-black/60 transition-colors" aria-label="Edit note">
            <Pencil size={12} />
          </button>
        )}
        <button onClick={onDelete} className="p-1 text-black/20 hover:text-black/60 transition-colors" aria-label="Delete note">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

interface Props {
  source: LibrarySource
  categories: SourceCategory[]
  allTags: string[]
  sourceLists?: SourceList[]
  onSetCategory: (id: string, categoryId: string | null) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onToggleSourceInList?: (listId: string, sourceId: string) => void
  onCreateSourceList?: (name: string) => string
  onPromoteTag?: (tag: string) => void
  onTagClick?: (tag: string) => void
  onCreateCategory: (name: string) => string
  onRenameSource?: (id: string, name: string) => void
  onClose: () => void
  topLayer?: boolean
  allFeedPosts?: Post[]
  savedLists?: SavedList[]
  isRead?: (id: string) => boolean
}

export function SourcePanel({ source, categories, allTags, sourceLists, onSetCategory, onAddTag, onRemoveTag, onToggleSourceInList, onCreateSourceList, onPromoteTag, onTagClick, onCreateCategory, onRenameSource, onClose, topLayer, allFeedPosts, savedLists, isRead }: Props) {
  const { addComment, deleteComment, editComment, getComments } = useComments()
  const comments = getComments(source.id)
  const [draft, setDraft] = useState('')
  const [savedReadOpen, setSavedReadOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(source.name)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const newCategoryRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  function handleSaveRename() {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== source.name) onRenameSource?.(source.id, trimmed)
    setEditingName(false)
  }

  function handleCreateCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    const id = onCreateCategory(name)
    onSetCategory(source.id, id)
    setAddingCategory(false)
    setNewCategoryName('')
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSubmit() {
    if (!draft.trim()) return
    addComment(source.id, draft)
    setDraft('')
  }

  function handleAddTag(tag: string) {
    const t = tag.trim().toLowerCase()
    if (!t) return
    onAddTag(source.id, t)
    setTagInput('')
    setTagSuggestionsOpen(false)
  }

  const filteredSuggestions = tagInput.trim()
    ? allTags.filter((t) => t.includes(tagInput.toLowerCase()) && !source.tags.includes(t))
    : allTags.filter((t) => !source.tags.includes(t))

  // Saved & Read
  const savedByList = (savedLists ?? []).map(list => ({
    id: list.id,
    name: list.name,
    posts: list.postIds
      .filter(id => list.postData[id]?.sourceId === source.id)
      .map(id => list.postData[id]),
  })).filter(g => g.posts.length > 0)
  const allSavedIds = new Set((savedLists ?? []).flatMap(l => l.postIds))
  const readOnlyPosts = (allFeedPosts ?? []).filter(
    p => p.sourceId === source.id && (isRead ? isRead(p.id) : false) && !allSavedIds.has(p.id)
  )
  const savedReadTotal = savedByList.reduce((n, g) => n + g.posts.length, 0) + readOnlyPosts.length

  const sourceDomain = (() => {
    try { return new URL(source.url).hostname.replace(/^www\./, '') } catch { return source.url }
  })()

  return (
    <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white flex flex-col overflow-hidden shadow-xl border-l border-black/10 animate-slide-right ${topLayer ? 'z-[95]' : 'z-[70]'}`}>
        {/* Color bar */}
        <div className="h-1 w-full shrink-0" style={{ backgroundColor: source.color }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <span className="text-[10px] font-medium text-black/35 tracking-wide truncate max-w-[70%]">
            {sourceDomain}
          </span>
          <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-4">
            {/* Name */}
            <div className="group/name flex items-start gap-2">
              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  autoFocus
                  className="flex-1 font-display text-lg font-semibold text-black leading-snug border-b border-black/30 outline-none bg-transparent pb-0.5"
                />
              ) : (
                <>
                  <h2 className="font-display text-lg font-semibold text-black leading-snug flex-1">
                    {source.name}
                  </h2>
                  {onRenameSource && (
                    <button
                      onClick={() => { setNameValue(source.name); setEditingName(true) }}
                      className="opacity-0 group-hover/name:opacity-100 shrink-0 p-0.5 text-black/20 hover:text-black transition-all mt-1"
                      aria-label="Rename source"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Category selector */}
            <div className="space-y-1">
              <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40">
                Category
              </label>
              {addingCategory ? (
                <div className="flex gap-1.5">
                  <input
                    ref={newCategoryRef}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCategory()
                      if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName('') }
                    }}
                    autoFocus
                    placeholder="New category name…"
                    className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                  />
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-2 py-1.5 text-xs bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingCategory(false); setNewCategoryName('') }}
                    className="px-2 py-1.5 text-xs border border-black/15 text-black/40 hover:border-black/30 hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <select
                    value={source.categoryId ?? ''}
                    onChange={(e) => onSetCategory(source.id, e.target.value || null)}
                    className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors bg-white"
                  >
                    <option value="">— None —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setAddingCategory(true)}
                    className="px-2 py-1.5 text-xs border border-black/15 text-black/40 hover:border-black/30 hover:text-black transition-colors"
                    title="Add new category"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40">
                Tags
              </label>
              {source.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {source.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 text-[9px] text-black/50 border border-black/15 px-1.5 py-0.5"
                    >
                      <button
                        onClick={() => onTagClick?.(tag)}
                        className={`leading-none ${onTagClick ? 'hover:text-black transition-colors' : ''}`}
                        title={onTagClick ? `See all sources tagged "${tag}"` : undefined}
                      >
                        {tag}
                      </button>
                      <button
                        onClick={() => onRemoveTag(source.id, tag)}
                        className="text-black/25 hover:text-black/60 transition-colors leading-none ml-0.5"
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                      {onPromoteTag && (
                        <button
                          onClick={() => onPromoteTag(tag)}
                          title="Promote to category"
                          className="text-black/20 hover:text-black/50 transition-colors leading-none ml-0.5"
                          aria-label={`Promote ${tag} to category`}
                        >
                          ↑
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <div className="relative flex gap-1.5">
                <input
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setTagSuggestionsOpen(true) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(tagInput) }
                    if (e.key === 'Escape') setTagSuggestionsOpen(false)
                  }}
                  onFocus={() => setTagSuggestionsOpen(true)}
                  placeholder="Add a tag…"
                  className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                />
                <button
                  onClick={() => handleAddTag(tagInput)}
                  disabled={!tagInput.trim()}
                  className="px-2 py-1.5 text-xs border border-black/15 text-black/40 hover:border-black/40 hover:text-black transition-colors disabled:opacity-30"
                >
                  <Plus size={11} />
                </button>
                {tagSuggestionsOpen && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-black/15 z-10 shadow-sm max-h-32 overflow-y-auto">
                    {filteredSuggestions.map((t) => (
                      <button
                        key={t}
                        onMouseDown={(e) => { e.preventDefault(); handleAddTag(t) }}
                        className="block w-full text-left px-3 py-1.5 text-[10px] text-black/70 hover:bg-black/5 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Source Lists */}
            {sourceLists && (
              <div className="space-y-2">
                <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40">
                  Lists
                </label>
                {/* Current memberships */}
                {sourceLists.filter(l => l.sourceIds.includes(source.id)).length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {sourceLists
                      .filter(l => l.sourceIds.includes(source.id))
                      .map(list => (
                        <span key={list.id} className="inline-flex items-center gap-0.5 text-[9px] text-black/50 border border-black/15 px-1.5 py-0.5">
                          {list.name}
                          <button
                            onClick={() => onToggleSourceInList?.(list.id, source.id)}
                            className="text-black/25 hover:text-black/60 transition-colors leading-none ml-0.5"
                            aria-label={`Remove from ${list.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    }
                  </div>
                )}
                {/* Add to list */}
                {addingList ? (
                  <div className="space-y-1.5">
                    {/* Existing lists not yet added */}
                    {sourceLists.filter(l => !l.sourceIds.includes(source.id)).length > 0 && (
                      <div className="flex flex-col gap-0.5 border border-black/10 max-h-32 overflow-y-auto">
                        {sourceLists
                          .filter(l => !l.sourceIds.includes(source.id))
                          .map(list => (
                            <button
                              key={list.id}
                              onMouseDown={(e) => { e.preventDefault(); onToggleSourceInList?.(list.id, source.id); setAddingList(false) }}
                              className="text-left px-2.5 py-1.5 text-xs text-black/70 hover:bg-black/5 transition-colors"
                            >
                              {list.name}
                            </button>
                          ))
                        }
                      </div>
                    )}
                    {/* New list input */}
                    <div className="flex gap-1.5">
                      <input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newListName.trim()) {
                            const id = onCreateSourceList?.(newListName.trim())
                            if (id) onToggleSourceInList?.(id, source.id)
                            setNewListName('')
                            setAddingList(false)
                          }
                          if (e.key === 'Escape') { setAddingList(false); setNewListName('') }
                        }}
                        autoFocus
                        placeholder="New list name…"
                        className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                      />
                      <button
                        onClick={() => { setAddingList(false); setNewListName('') }}
                        className="px-2 py-1.5 text-xs border border-black/15 text-black/40 hover:border-black/30 hover:text-black transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingList(true)}
                    className="text-[10px] text-black/30 hover:text-black transition-colors flex items-center gap-1"
                  >
                    <Plus size={10} />
                    Add to list
                  </button>
                )}
              </div>
            )}

            {/* Feed status + open */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 border ${source.inFeed ? 'border-black/20 text-black/50' : 'border-black/10 text-black/25'}`}>
                {source.inFeed ? 'In feed' : 'List only'}
              </span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-medium hover:bg-black/80 transition-colors"
              >
                Visit source
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>

          <div className="border-t border-black/10 mx-5" />

          {/* Notes */}
          <div className="px-5 py-5 space-y-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
              Notes {comments.length > 0 && `(${comments.length})`}
            </h3>

            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((c) => (
                  <NoteRow
                    key={c.id}
                    text={c.text}
                    createdAt={c.createdAt}
                    onEdit={(text) => editComment(source.id, c.id, text)}
                    onDelete={() => deleteComment(source.id, c.id)}
                  />
                ))}
              </div>
            )}

            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
                }}
                placeholder="Add a note…"
                rows={3}
                className="w-full text-sm border border-black/15 px-3 py-2.5 resize-none outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
              />
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-black/25">⌘ + Enter to save</span>
                <button
                  onClick={handleSubmit}
                  disabled={!draft.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Saved & Read */}
          {savedReadTotal > 0 && (
            <>
              <div className="border-t border-black/10 mx-5" />
              <div className="px-5 py-5 space-y-3">
                <button
                  onClick={() => setSavedReadOpen(v => !v)}
                  className="flex items-center gap-1.5 w-full text-left"
                >
                  {savedReadOpen ? <ChevronDown size={12} className="text-black/30" /> : <ChevronRight size={12} className="text-black/30" />}
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
                    Saved & Read ({savedReadTotal})
                  </h3>
                </button>
                {savedReadOpen && (
                  <div className="space-y-3">
                    {savedByList.map(group => (
                      <div key={group.id}>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 mb-1">{group.name}</p>
                        <div className="space-y-1.5">
                          {group.posts.map(post => (
                            <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-black/60 hover:text-black transition-colors leading-snug line-clamp-2">
                              {post.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                    {readOnlyPosts.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 mb-1">Read</p>
                        <div className="space-y-1.5">
                          {readOnlyPosts.map(post => (
                            <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-black/60 hover:text-black transition-colors leading-snug line-clamp-2">
                              {post.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
    </div>
  )
}
