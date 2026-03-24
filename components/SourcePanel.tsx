'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ArrowUpRight, Pencil, Check, Trash2, Plus, FolderPlus, ExternalLink, FileText, Newspaper, Database, ChevronLeft, ChevronDown, ChevronRight, Share2 } from 'lucide-react'
import { useComments } from '@/hooks/useComments'
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'
import type { LibrarySource, SourceCategory, SourceIndustry, SourceList, Post, Space, SourceCard } from '@/lib/types'
import { PostPanel } from './PostPanel'

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
  onAddToSpace,
  spaceLinks,
  onNavigateToSpace,
}: {
  text: string
  createdAt: number
  onEdit: (text: string) => void
  onDelete: () => void
  onAddToSpace?: (content: string) => void
  spaceLinks?: { id: string; name: string }[]
  onNavigateToSpace?: (spaceId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const [confirmDel, setConfirmDel] = useState(false)
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
        {spaceLinks && spaceLinks.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {spaceLinks.map((s) => (
              <button
                key={s.id}
                onClick={() => onNavigateToSpace?.(s.id)}
                className="text-[9px] text-black/40 hover:text-black/70 transition-colors border border-black/15 px-1.5 py-0.5 hover:border-black/30"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {onAddToSpace && !editing && (
        <button onClick={() => onAddToSpace(text)} className="p-1 text-black/20 hover:text-black/60 transition-colors shrink-0" aria-label="Add to space" title="Add to space">
          <FolderPlus size={12} />
        </button>
      )}
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
        {confirmDel ? (
          <>
            <button onClick={() => { onDelete(); setConfirmDel(false) }} className="p-1 text-red-400 hover:text-red-600 transition-colors text-[9px] font-medium" aria-label="Confirm delete">Yes</button>
            <button onClick={() => setConfirmDel(false)} className="p-1 text-black/30 hover:text-black transition-colors text-[9px]" aria-label="Cancel">No</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="p-1 text-black/20 hover:text-black/60 transition-colors" aria-label="Delete note">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

interface Props {
  source: LibrarySource
  categories: SourceCategory[]
  industries?: SourceIndustry[]
  allTags: string[]
  sourceLists?: SourceList[]
  onSetCategory: (id: string, categoryId: string | null) => void
  onSetIndustry?: (id: string, industryId: string | null) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onToggleSourceInList?: (listId: string, sourceId: string) => void
  onCreateSourceList?: (name: string) => string
  onPromoteTag?: (tag: string) => void
  onTagClick?: (tag: string) => void
  onCreateCategory: (name: string) => string
  onCreateIndustry?: (name: string) => string
  onRenameSource?: (id: string, name: string) => void
  onBack?: () => void
  onClose: () => void
  topLayer?: boolean
  inline?: boolean
  allFeedPosts?: Post[]
  savedLists?: Space[]
  isRead?: (id: string) => boolean
  onAddNoteToSpace?: (content: string, commentId?: string) => void
  onAddSourceCard?: (sourceId: string, card: SourceCard) => void
  onRemoveSourceCard?: (sourceId: string, cardId: string) => void
  onNavigateToSpace?: (spaceId: string) => void
  onCommentEdited?: (commentId: string, newText: string) => void
  onOpenPiece?: (post: Post) => void
  onAddSourceToSpace?: (spaceId: string) => void
  allSpaces?: { id: string; name: string }[]
  commentToSpaces?: Record<string, { id: string; name: string }[]>
  onSetSummary?: (id: string, summary: string) => void
  onAddPieceToSpace?: (spaceId: string, card: SourceCard) => void
  allLibrarySources?: LibrarySource[]
  onAddAssociation?: (targetId: string) => void
  onRemoveAssociation?: (targetId: string) => void
  onOpenAssociation?: (source: LibrarySource) => void
  onNavigateToSourceSpace?: (source: LibrarySource) => void
  onChangePieceSource?: (card: SourceCard) => void
  onShowPieceOnAssociations?: (card: SourceCard, targetSourceIds: string[]) => void
}

export function SourcePanel({ source, categories, industries = [], allTags, sourceLists, onSetCategory, onSetIndustry, onAddTag, onRemoveTag, onToggleSourceInList, onCreateSourceList, onPromoteTag, onTagClick, onCreateCategory, onCreateIndustry, onRenameSource, onBack, onClose, topLayer, inline, allFeedPosts, savedLists, isRead, onAddNoteToSpace, onAddSourceCard, onRemoveSourceCard, onNavigateToSpace, onCommentEdited, onOpenPiece, onAddSourceToSpace, allSpaces, commentToSpaces, onSetSummary, onAddPieceToSpace, allLibrarySources, onAddAssociation, onRemoveAssociation, onOpenAssociation, onNavigateToSourceSpace, onChangePieceSource, onShowPieceOnAssociations }: Props) {
  const { addComment, deleteComment, editComment, getComments } = useComments()
  const { getSourceConnections } = useKnowledgeGraph()
  const connections = getSourceConnections(source.id)
  const totalConnections = connections.notes.length + connections.posts.length + connections.sourceItems.length
  const comments = getComments(source.id)
  const [draft, setDraft] = useState('')
  // inSpacesOpen removed — section is always expanded
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingIndustry, setAddingIndustry] = useState(false)
  const [newIndustryName, setNewIndustryName] = useState('')
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(source.name)
  // Pieces (manually-added links)
  const [addingPiece, setAddingPiece] = useState(false)
  const [pieceUrl, setPieceUrl] = useState('')
  const [pieceTitle, setPieceTitle] = useState('')
  const [confirmRemovePieceId, setConfirmRemovePieceId] = useState<string | null>(null)
  const [openPiecePost, setOpenPiecePost] = useState<Post | null>(null)
  const [expandedPieceId, setExpandedPieceId] = useState<string | null>(null)
  const [addToSpacePickerOpen, setAddToSpacePickerOpen] = useState(false)
  const [addToSpaceSearch, setAddToSpaceSearch] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(() => comments.length > 0)
  const [piecesOpen, setPiecesOpen] = useState(() => (source.cards ?? []).length > 0)
  const [inSpacesOpen, setInSpacesOpen] = useState(false)
  const [assocPickerOpen, setAssocPickerOpen] = useState(false)
  const [assocSearch, setAssocSearch] = useState('')
  const [summaryValue, setSummaryValue] = useState(source.summary ?? '')
  const [pieceToSpaceCard, setPieceToSpaceCard] = useState<SourceCard | null>(null)
  const [pieceToSpaceSearch, setPieceToSpaceSearch] = useState('')
  const [pieceAssocCard, setPieceAssocCard] = useState<SourceCard | null>(null)
  const [selectedAssocIds, setSelectedAssocIds] = useState<string[]>([])
  const [pieceAssocConfirmed, setPieceAssocConfirmed] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const newCategoryRef = useRef<HTMLInputElement>(null)
  const newIndustryRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const pieceUrlRef = useRef<HTMLInputElement>(null)
  const tagInputContainerRef = useRef<HTMLDivElement>(null)

  // Keep nameValue in sync when source.name updates externally
  useEffect(() => {
    if (!editingName) setNameValue(source.name)
  }, [source.name, editingName])

  useEffect(() => { setSummaryValue(source.summary ?? '') }, [source.summary])

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

  function handleCreateIndustry() {
    const name = newIndustryName.trim()
    if (!name || !onCreateIndustry) return
    const id = onCreateIndustry(name)
    onSetIndustry?.(source.id, id)
    setAddingIndustry(false)
    setNewIndustryName('')
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    if (!tagSuggestionsOpen) return
    function handleClick(e: MouseEvent) {
      if (tagInputContainerRef.current && !tagInputContainerRef.current.contains(e.target as Node)) {
        setTagSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [tagSuggestionsOpen])

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
    posts: (list.postIds ?? [])
      .filter(id => list.postData?.[id]?.sourceId === source.id)
      .map(id => list.postData![id]),
  })).filter(g => g.posts.length > 0)
  const allSavedIds = new Set((savedLists ?? []).flatMap(l => l.postIds ?? []))
  const readOnlyPosts = (allFeedPosts ?? []).filter(
    p => p.sourceId === source.id && (isRead ? isRead(p.id) : false) && !allSavedIds.has(p.id)
  )
  const savedReadTotal = savedByList.reduce((n, g) => n + g.posts.length, 0) + readOnlyPosts.length

  const sourceDomain = (() => {
    try { return new URL(source.url).hostname.replace(/^www\./, '') } catch { return source.url }
  })()

  function displayDomain(url: string) {
    try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
  }

  // Compute which spaces a SourceCard appears in
  function cardSpaceNames(cardId: string): { id: string; name: string }[] {
    if (!savedLists?.length) return []
    return savedLists.flatMap(space =>
      space.items?.some(item =>
        item.refId === cardId ||
        item.postData?.id === cardId ||
        item.cardRef === cardId
      )
        ? [{ id: space.id, name: space.name }]
        : []
    )
  }

  function pieceAsPost(card: SourceCard): Post {
    return {
      id: card.id,
      title: card.title,
      url: card.url,
      date: new Date(card.addedAt).toISOString(),
      sourceId: source.id,
      sourceName: source.name,
      sourceColor: source.color,
    } as Post
  }

  function handleSavePiece() {
    const url = pieceUrl.trim()
    if (!url || !onAddSourceCard) return
    const card: SourceCard = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url,
      title: pieceTitle.trim() || displayDomain(url),
      addedAt: Date.now(),
    }
    onAddSourceCard(source.id, card)
    setPieceUrl('')
    setPieceTitle('')
    setAddingPiece(false)
  }

  return (
    <>
    <div className={inline
      ? 'w-[28rem] shrink-0 flex flex-col overflow-hidden border border-black/10 bg-white animate-slide-right h-[calc(100vh-57px)] relative z-[45]'
      : `fixed top-[57px] right-0 h-[calc(100vh-57px)] w-full max-w-md bg-white flex flex-col overflow-hidden shadow-xl border-l border-black/10 animate-slide-right ${topLayer ? 'z-[95]' : 'z-[70]'}`
    }>
        {/* Color bar */}
        <div className="h-1 w-full shrink-0" style={{ backgroundColor: source.color }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          {onBack && (
            <button onClick={onBack} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black shrink-0"><ChevronLeft size={15} /></button>
          )}
          <span className="text-[10px] font-medium text-black/35 tracking-wide truncate max-w-[70%]">
            {sourceDomain}
          </span>
          <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
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

            {/* Summary */}
            <textarea
              value={summaryValue}
              onChange={(e) => setSummaryValue(e.target.value)}
              onBlur={() => {
                const v = summaryValue.trim()
                if (v !== (source.summary ?? '')) onSetSummary?.(source.id, v)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
              placeholder="Add a one-line summary…"
              rows={2}
              className="w-full text-xs text-black/60 resize-none outline-none placeholder:text-black/20 bg-transparent leading-relaxed border-b border-transparent focus:border-black/15 transition-colors"
            />

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

            {/* Associations — always flat, no collapsible */}
            {(onAddAssociation || (source.associations ?? []).length > 0) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40">
                    Associations
                  </label>
                  {onAddAssociation && (
                    <button
                      onClick={() => { setAssocPickerOpen(v => !v); setAssocSearch('') }}
                      className="text-[9px] text-black/30 hover:text-black transition-colors flex items-center gap-0.5"
                    >
                      <Plus size={9} />Add
                    </button>
                  )}
                </div>
                {(source.associations ?? []).length === 0 && !assocPickerOpen && (
                  <p className="text-[10px] text-black/25">No associations</p>
                )}
                {(source.associations ?? []).length > 0 && (
                  <div className="space-y-1">
                    {(source.associations ?? []).map((targetId) => {
                      const target = allLibrarySources?.find(s => s.id === targetId)
                      if (!target) return null
                      return (
                        <div key={targetId} className="flex items-center gap-2 group/assoc">
                          <button
                            onClick={() => onOpenAssociation?.(target)}
                            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black transition-colors flex-1 text-left"
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: target.color }} />
                            {target.name}
                          </button>
                          {onNavigateToSourceSpace && (
                            <button
                              onClick={() => onNavigateToSourceSpace(target)}
                              className="p-1 text-black/30 hover:text-black/70 transition-colors"
                              title="Go to their space"
                            >
                              <ArrowUpRight size={11} />
                            </button>
                          )}
                          {onRemoveAssociation && (
                            <button
                              onClick={() => onRemoveAssociation(targetId)}
                              className="text-black/20 hover:text-black/60 transition-colors opacity-0 group-hover/assoc:opacity-100"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {assocPickerOpen && allLibrarySources && (
                  <div className="space-y-1">
                    <input
                      value={assocSearch}
                      onChange={(e) => setAssocSearch(e.target.value)}
                      placeholder="Search sources…"
                      autoFocus
                      className="w-full text-xs border border-black/20 px-2 py-1.5 outline-none focus:border-black/40 transition-colors"
                    />
                    <div className="border border-black/10 bg-white max-h-36 overflow-y-auto">
                      {allLibrarySources
                        .filter(s => s.id !== source.id && !(source.associations ?? []).includes(s.id) && s.name.toLowerCase().includes(assocSearch.toLowerCase()))
                        .map((s) => (
                          <button
                            key={s.id}
                            onClick={() => { onAddAssociation!(s.id); setAssocPickerOpen(false); setAssocSearch('') }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 transition-colors text-black/70 flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Industry selector */}
            {(industries.length > 0 || onCreateIndustry) && (
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40">
                  Industry
                </label>
                {addingIndustry ? (
                  <div className="flex gap-1.5">
                    <input
                      ref={newIndustryRef}
                      value={newIndustryName}
                      onChange={(e) => setNewIndustryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateIndustry()
                        if (e.key === 'Escape') { setAddingIndustry(false); setNewIndustryName('') }
                      }}
                      autoFocus
                      placeholder="New industry name…"
                      className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                    />
                    <button
                      onClick={handleCreateIndustry}
                      disabled={!newIndustryName.trim()}
                      className="px-2 py-1.5 text-xs bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingIndustry(false); setNewIndustryName('') }}
                      className="px-2 py-1.5 text-xs border border-black/15 text-black/40 hover:border-black/30 hover:text-black transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <select
                      value={source.industryId ?? ''}
                      onChange={(e) => onSetIndustry?.(source.id, e.target.value || null)}
                      className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors bg-white"
                    >
                      <option value="">— None —</option>
                      {industries.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    {onCreateIndustry && (
                      <button
                        onClick={() => setAddingIndustry(true)}
                        className="px-2 py-1.5 text-xs border border-black/15 text-black/40 hover:border-black/30 hover:text-black transition-colors"
                        title="Add new industry"
                      >
                        <Plus size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Org Type selector */}
            <div className="space-y-1">
              <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40">
                Org Type
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
                    placeholder="New org type name…"
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
                    title="Add new org type"
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
                          title="Promote to org type"
                          className="text-black/20 hover:text-black/50 transition-colors leading-none ml-0.5"
                          aria-label={`Promote ${tag} to org type`}
                        >
                          ↑
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <div ref={tagInputContainerRef} className="relative flex gap-1.5">
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
                  Groups
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
                        placeholder="New group name…"
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
                    Add to group
                  </button>
                )}
              </div>
            )}

          </div>

          <div className="border-t border-black/10 mx-5" />

          {/* Notes */}
          <div className="px-5 py-3">
            <button
              onClick={() => setNotesOpen(v => !v)}
              className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-black/40 hover:text-black/60 transition-colors py-2"
            >
              <span>Notes {comments.length > 0 && `(${comments.length})`}</span>
              {notesOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>

            {notesOpen && (
              <div className="space-y-4 pb-2">
                {comments.length > 0 && (
                  <div className="space-y-3">
                    {comments.map((c) => {
                      const noteSpaceLinks = commentToSpaces
                        ? (commentToSpaces[c.id] ?? [])
                        : connections.notes
                            .filter(({ item }) => item.commentId === c.id || item.content === c.text)
                            .map(({ space }) => ({ id: space.id, name: space.name }))
                            .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
                      return (
                        <NoteRow
                          key={c.id}
                          text={c.text}
                          createdAt={c.createdAt}
                          onEdit={(text) => { editComment(source.id, c.id, text); onCommentEdited?.(c.id, text) }}
                          onDelete={() => deleteComment(source.id, c.id)}
                          onAddToSpace={onAddNoteToSpace ? (text) => onAddNoteToSpace(text, c.id) : undefined}
                          spaceLinks={noteSpaceLinks.length > 0 ? noteSpaceLinks : undefined}
                          onNavigateToSpace={onNavigateToSpace}
                        />
                      )
                    })}
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
            )}
          </div>

          {/* Pieces — manually-curated links pinned to this source */}
          {(onAddSourceCard || (source.cards ?? []).length > 0) && (
            <>
              <div className="border-t border-black/10 mx-5" />
              <div className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPiecesOpen(v => !v)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-black/40 hover:text-black/60 transition-colors py-2"
                  >
                    {piecesOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    Pieces {(source.cards ?? []).length > 0 && `(${(source.cards ?? []).length})`}
                  </button>
                  {piecesOpen && onAddSourceCard && !addingPiece && (
                    <button
                      onClick={() => { setAddingPiece(true); setTimeout(() => pieceUrlRef.current?.focus(), 10) }}
                      className="flex items-center gap-1 text-[10px] text-black/30 hover:text-black transition-colors"
                    >
                      <Plus size={10} />Add link
                    </button>
                  )}
                </div>

                {piecesOpen && addingPiece && (
                  <div className="space-y-2 border border-black/10 p-3 bg-black/[0.02]">
                    <input
                      ref={pieceUrlRef}
                      value={pieceUrl}
                      onChange={(e) => setPieceUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSavePiece(); if (e.key === 'Escape') { setAddingPiece(false); setPieceUrl(''); setPieceTitle('') } }}
                      placeholder="URL"
                      className="w-full text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                    />
                    <input
                      value={pieceTitle}
                      onChange={(e) => setPieceTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSavePiece(); if (e.key === 'Escape') { setAddingPiece(false); setPieceUrl(''); setPieceTitle('') } }}
                      placeholder="Title (optional — defaults to domain)"
                      className="w-full text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSavePiece}
                        disabled={!pieceUrl.trim()}
                        className="px-3 py-1.5 text-xs bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingPiece(false); setPieceUrl(''); setPieceTitle('') }}
                        className="px-2 py-1.5 text-xs text-black/40 hover:text-black transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {piecesOpen && (source.cards ?? []).length > 0 && (
                  <div className="space-y-3">
                    {(source.cards ?? []).map((card) => (
                      <div key={card.id} className="space-y-1">
                      <div className="group flex items-start gap-2">
                        <div
                          className="flex-1 min-w-0 space-y-0.5 cursor-pointer"
                          onClick={() => onOpenPiece ? onOpenPiece(pieceAsPost(card)) : setOpenPiecePost(pieceAsPost(card))}
                        >
                          <p className="text-sm font-medium text-black leading-snug truncate hover:underline">{card.title}</p>
                          {card.url && (
                            <div className="flex items-center gap-0.5 text-[10px] text-black/35">
                              <ExternalLink size={9} className="shrink-0" />
                              <span className="truncate">{displayDomain(card.url)}</span>
                            </div>
                          )}
                          {(() => {
                            const cardSpaces = cardSpaceNames(card.id)
                            if (!cardSpaces.length) return null
                            return (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {cardSpaces.map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={(e) => { e.stopPropagation(); onNavigateToSpace ? onNavigateToSpace(s.id) : (window.location.href = `/remix?space=${s.id}`) }}
                                    className="text-[9px] text-black/30 hover:text-black/60 transition-colors border border-black/10 px-1 py-0.5 hover:border-black/25"
                                  >
                                    {s.name}
                                  </button>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                          {confirmRemovePieceId === card.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-black/50">Remove?</span>
                              <button
                                onClick={() => { onRemoveSourceCard?.(source.id, card.id); setConfirmRemovePieceId(null) }}
                                className="px-1.5 py-0.5 text-[10px] bg-black text-white hover:bg-black/80 transition-colors"
                              >Yes</button>
                              <button
                                onClick={() => setConfirmRemovePieceId(null)}
                                className="px-1.5 py-0.5 text-[10px] text-black/40 hover:text-black transition-colors"
                              >No</button>
                            </div>
                          ) : (
                            <>
                              {card.url && (
                                <a
                                  href={card.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 text-black/20 hover:text-black/60 transition-colors opacity-0 group-hover:opacity-100"
                                  aria-label="Open link"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                              {onAddPieceToSpace && allSpaces && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPieceToSpaceCard(pieceToSpaceCard?.id === card.id ? null : card); setPieceToSpaceSearch('') }}
                                  className="p-1 text-black/20 hover:text-black/60 transition-colors opacity-0 group-hover:opacity-100"
                                  aria-label="Add to space"
                                >
                                  <FolderPlus size={12} />
                                </button>
                              )}
                              {onChangePieceSource && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onChangePieceSource(card) }}
                                  className="p-1 text-black/20 hover:text-black/60 transition-colors opacity-0 group-hover:opacity-100"
                                  aria-label="Change source"
                                  title="Change source"
                                >
                                  <Database size={12} />
                                </button>
                              )}
                              {onShowPieceOnAssociations && (source.associations ?? []).length > 0 && (
                                pieceAssocConfirmed === card.id ? (
                                  <span className="text-[10px] text-black/40 px-1">Added ✓</span>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (pieceAssocCard?.id === card.id) {
                                        setPieceAssocCard(null)
                                        setSelectedAssocIds([])
                                      } else {
                                        setPieceAssocCard(card)
                                        const alreadyOn = (source.associations ?? []).filter(targetId =>
                                          allLibrarySources?.find(s => s.id === targetId)?.cards?.some(c => c.id === card.id)
                                        )
                                        setSelectedAssocIds(alreadyOn)
                                      }
                                    }}
                                    className="p-1 text-black/20 hover:text-black/60 transition-colors opacity-0 group-hover:opacity-100"
                                    aria-label="Show on associations"
                                    title="Show on associations"
                                  >
                                    <Share2 size={12} />
                                  </button>
                                )
                              )}
                              {onRemoveSourceCard && (
                                <button
                                  onClick={() => setConfirmRemovePieceId(card.id)}
                                  className="p-1 text-black/20 hover:text-black/60 transition-colors opacity-0 group-hover:opacity-100"
                                  aria-label="Remove piece"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {/* Inline assoc picker — below the flex row */}
                      {pieceAssocCard?.id === card.id && onShowPieceOnAssociations && (source.associations ?? []).length > 0 && (
                        <div className="space-y-1.5 border border-black/10 p-2 bg-black/[0.01]">
                          <p className="text-[9px] text-black/40 font-semibold uppercase tracking-widest">Show on associated sources</p>
                          <div className="space-y-1">
                            {(source.associations ?? []).map(targetId => {
                              const target = allLibrarySources?.find(s => s.id === targetId)
                              if (!target) return null
                              return (
                                <label key={targetId} className="flex items-center gap-2 text-xs text-black/60 cursor-pointer hover:text-black transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={selectedAssocIds.includes(targetId)}
                                    onChange={(e) => setSelectedAssocIds(prev => e.target.checked ? [...prev, targetId] : prev.filter(x => x !== targetId))}
                                    className="accent-black"
                                  />
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: target.color }} />
                                  {target.name}
                                </label>
                              )
                            })}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => { onShowPieceOnAssociations(card, source.associations!); setPieceAssocCard(null); setSelectedAssocIds([]); setPieceAssocConfirmed(card.id); setTimeout(() => setPieceAssocConfirmed(null), 2000) }}
                              className="text-[10px] text-black/50 hover:text-black transition-colors border border-black/15 px-2 py-0.5"
                            >
                              Show on all
                            </button>
                            <button
                              onClick={() => { if (selectedAssocIds.length > 0) { onShowPieceOnAssociations(card, selectedAssocIds); setPieceAssocCard(null); setSelectedAssocIds([]); setPieceAssocConfirmed(card.id); setTimeout(() => setPieceAssocConfirmed(null), 2000) } }}
                              disabled={selectedAssocIds.length === 0}
                              className="text-[10px] text-black/50 hover:text-black transition-colors border border-black/15 px-2 py-0.5 disabled:opacity-30"
                            >
                              Confirm selected
                            </button>
                            <button onClick={() => { setPieceAssocCard(null); setSelectedAssocIds([]) }} className="text-[10px] text-black/30 hover:text-black transition-colors ml-auto">Cancel</button>
                          </div>
                        </div>
                      )}
                      </div>
                    ))}
                  </div>
                )}

                {pieceToSpaceCard && piecesOpen && onAddPieceToSpace && allSpaces && (
                  <div className="mt-2 space-y-1 border border-black/10 p-2 bg-black/[0.01]">
                    <p className="text-[9px] text-black/40 mb-1">Add &ldquo;{pieceToSpaceCard.title}&rdquo; to space:</p>
                    <input
                      value={pieceToSpaceSearch}
                      onChange={(e) => setPieceToSpaceSearch(e.target.value)}
                      placeholder="Search spaces…"
                      autoFocus
                      className="w-full text-xs border border-black/15 px-2 py-1 outline-none focus:border-black/40"
                    />
                    <div className="border border-black/10 bg-white max-h-32 overflow-y-auto">
                      {allSpaces
                        .filter(s => s.name.toLowerCase().includes(pieceToSpaceSearch.toLowerCase()))
                        .map(s => (
                          <button
                            key={s.id}
                            onClick={() => { onAddPieceToSpace!(s.id, pieceToSpaceCard!); setPieceToSpaceCard(null); setPieceToSpaceSearch('') }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 text-black/70"
                          >
                            {s.name}
                          </button>
                        ))}
                    </div>
                    <button onClick={() => { setPieceToSpaceCard(null); setPieceToSpaceSearch('') }} className="text-[9px] text-black/30 hover:text-black transition-colors">Cancel</button>
                  </div>
                )}

                {piecesOpen && (source.cards ?? []).length === 0 && !addingPiece && (
                  <p className="text-[10px] text-black/25 pb-2">No pieces yet. Add links to curate content for this source.</p>
                )}
              </div>
            </>
          )}

          {/* In Spaces */}
          <>
            <div className="border-t border-black/10 mx-5" />
            <div className="px-5 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setInSpacesOpen(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-black/40 hover:text-black/60 transition-colors py-2"
                >
                  {inSpacesOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  In Spaces {totalConnections > 0 && `(${totalConnections})`}
                </button>
                {inSpacesOpen && onAddSourceToSpace && allSpaces && (
                  <button
                    onClick={() => setAddToSpacePickerOpen(v => !v)}
                    className="text-[9px] text-black/30 hover:text-black transition-colors flex items-center gap-0.5"
                  >
                    <Plus size={9} />Add to space
                  </button>
                )}
              </div>

              {inSpacesOpen && (
                <div className="space-y-3 pb-2">
                  {addToSpacePickerOpen && allSpaces && onAddSourceToSpace && (
                    <div className="space-y-1">
                      <input
                        value={addToSpaceSearch}
                        onChange={(e) => setAddToSpaceSearch(e.target.value)}
                        placeholder="Search spaces…"
                        autoFocus
                        className="w-full text-xs border border-black/20 px-2 py-1.5 outline-none focus:border-black/40 transition-colors"
                      />
                      <div className="border border-black/10 bg-white max-h-36 overflow-y-auto">
                        {allSpaces
                          .filter(s => s.name.toLowerCase().includes(addToSpaceSearch.toLowerCase()))
                          .map((s) => (
                            <button
                              key={s.id}
                              onClick={() => { onAddSourceToSpace(s.id); setAddToSpacePickerOpen(false); setAddToSpaceSearch('') }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 transition-colors text-black/70"
                            >
                              {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {totalConnections === 0 && (
                    <p className="text-[10px] text-black/25">Not yet referenced in any space.</p>
                  )}

                  {totalConnections > 0 && (() => {
                    const seenIds = new Set<string>()
                    const uniqueSpaces: { id: string; name: string }[] = []
                    for (const { space } of [...connections.notes, ...connections.posts, ...connections.sourceItems]) {
                      if (!seenIds.has(space.id)) {
                        seenIds.add(space.id)
                        uniqueSpaces.push({ id: space.id, name: space.name })
                      }
                    }
                    return (
                      <div className="space-y-1">
                        {uniqueSpaces.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => onNavigateToSpace ? onNavigateToSpace(s.id) : (window.location.href = `/remix?space=${s.id}`)}
                            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black transition-colors w-full text-left"
                          >
                            <span className="w-1 h-1 rounded-full bg-black/20 shrink-0" />
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )
                  })()}

                  {totalConnections > 0 && (
                    <button
                      onClick={() => setDetailsOpen(v => !v)}
                      className="text-[9px] text-black/30 hover:text-black transition-colors flex items-center gap-1 mt-1"
                    >
                      {detailsOpen ? '▾' : '▸'} Connection details
                    </button>
                  )}

                  {detailsOpen && (
                    <div className="space-y-3 pt-1 border-t border-black/8">
                  {connections.notes.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 flex items-center gap-1"><FileText size={9} />Notes</p>
                      {connections.notes.map(({ item, space }) => (
                        <div key={`${item.id}-${space.id}`} className="flex items-start gap-2">
                          <p className="flex-1 text-xs text-black/60 leading-snug line-clamp-2">{item.content ?? ''}</p>
                          <button
                            onClick={() => onNavigateToSpace ? onNavigateToSpace(space.id) : (window.location.href = `/remix?space=${space.id}`)}
                            className="shrink-0 text-[9px] text-black/30 hover:text-black transition-colors whitespace-nowrap"
                          >
                            → {space.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {connections.posts.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 flex items-center gap-1"><Newspaper size={9} />Articles</p>
                      {connections.posts.map(({ item, space }) => {
                        const isExpanded = expandedPieceId === item.id
                        return (
                          <div key={`${item.id}-${space.id}`} className="space-y-1">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                {item.postData ? (
                                  <button
                                    onClick={() => setExpandedPieceId(isExpanded ? null : item.id)}
                                    className="text-xs text-black/70 leading-snug line-clamp-2 text-left hover:text-black transition-colors w-full"
                                  >
                                    {item.postData.title}
                                  </button>
                                ) : (
                                  <p className="text-xs text-black/60 leading-snug line-clamp-2">{item.content ?? ''}</p>
                                )}
                                <span className="text-[9px] text-black/30">{space.name}</span>
                              </div>
                              <button
                                onClick={() => onNavigateToSpace ? onNavigateToSpace(space.id) : (window.location.href = `/remix?space=${space.id}`)}
                                className="shrink-0 text-[9px] text-black/30 hover:text-black transition-colors whitespace-nowrap mt-0.5"
                              >
                                → open
                              </button>
                            </div>
                            {isExpanded && item.postData && (
                              <div className="border border-black/8 bg-black/[0.015] p-3 space-y-2">
                                {item.postData.image && (
                                  <img src={item.postData.image} alt={item.postData.title} className="w-full h-20 object-cover" />
                                )}
                                {item.postData.excerpt && (
                                  <p className="text-[10px] text-black/50 leading-relaxed line-clamp-3">{item.postData.excerpt}</p>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-black/25 uppercase tracking-widest">
                                    {new Date(item.postData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <a
                                    href={item.postData.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-black/40 hover:text-black transition-colors flex items-center gap-0.5"
                                  >
                                    Open <ArrowUpRight size={9} />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {connections.sourceItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 flex items-center gap-1"><Database size={9} />As source</p>
                      {connections.sourceItems.map(({ item, space }) => (
                        <div key={`${item.id}-${space.id}`} className="flex items-center gap-2">
                          <button
                            onClick={() => onNavigateToSpace ? onNavigateToSpace(space.id) : (window.location.href = `/remix?space=${space.id}`)}
                            className="text-xs text-black/60 hover:text-black transition-colors"
                          >
                            Pinned in {space.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
                </div>
              )}
            </div>
          </>

          {/* Bottom close button */}
          <div className="px-5 py-6 border-t border-black/8 flex justify-center mt-4">
            <button onClick={onClose} className="text-xs text-black/30 hover:text-black transition-colors flex items-center gap-1.5">
              <X size={11} />Close
            </button>
          </div>
        </div>
    </div>

    {openPiecePost && (
      <PostPanel
        post={openPiecePost}
        onClose={() => setOpenPiecePost(null)}
      />
    )}
    </>
  )
}
