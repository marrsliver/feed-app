'use client'

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  DndContext, DragEndEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Check, Layers, Search, Loader2, ArrowDownUp, Trash2, Folder, X } from 'lucide-react'
import { Header } from '@/components/Header'
import { SourcePickerModal } from '@/components/SourcePickerModal'
import { SourcePanel } from '@/components/SourcePanel'
import { PostPanel } from '@/components/PostPanel'
import { AddLinkPanel } from '@/components/AddLinkPanel'
import { UndoBar } from '@/components/UndoBar'
import { useSpaces } from '@/hooks/useSpaces'
import { useSpaceFolders } from '@/hooks/useSpaceFolders'
import type { SidebarEntry } from '@/hooks/useSpaceFolders'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useSourceCategories } from '@/hooks/useSourceCategories'
import { useSourceIndustries } from '@/hooks/useSourceIndustries'
import { useComments } from '@/hooks/useComments'
import { useSourceItems } from '@/hooks/useSourceItems'
import { usePanelStack } from '@/hooks/usePanelStack'
import { pushUndo } from '@/lib/undoStack'
import type { Space, SpaceItem, Post, LibrarySource } from '@/lib/types'
import { SpaceWorkspace } from '@/components/remix/SpaceCanvas'
import { SpaceRow, FolderRow, SortableRow, TrashBin, FolderTrashBin } from '@/components/remix/SpaceSidebar'

// ── Page ─────────────────────────────────────────────────────────────────────

function RemixPageInner() {
  const router = useRouter()
  const {
    spaces, loaded, createSpace, deleteSpace, restoreSpace, permanentDeleteSpace, trashedSpaces,
    renameSpace, updateDescription, addPost, addNote, addSource, addMedia,
    nestSpace, removeItem, reorderItems, updateItem, appendItem, updateSpaceTags,
    updateItemByGroupId: updateSpaceItemByGroupId,
    postToSpaces, commentToSpaces,
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
  const { sources, setCategory, setIndustry, addTag, removeTag, renameSource, allTags, addSourceCard, removeSourceCard, addAssociation, removeAssociation, addSource: addLibrarySource } = useLibrarySources()
  const { appendItem: appendSourceItem, updateItemByGroupId: updateSourceItemByGroupId, moveItemToSource: moveSourceItemToSource } = useSourceItems()

  function convertSpaceToSource(spaceId: string) {
    const space = spaces.find(s => s.id === spaceId)
    if (!space) return
    const newId = `user-${Date.now()}`
    addLibrarySource({ id: newId, name: space.name, url: '', feedUrl: '', type: 'rss', inFeed: false, feedGroup: 'user' })
    for (const item of space.items) {
      appendSourceItem(newId, { ...item, addedAt: Date.now() })
    }
    deleteSpace(spaceId)
    router.push(`/source-spaces?source=${newId}`)
  }
  const { categories, createCategory } = useSourceCategories()
  const { industries, createIndustry } = useSourceIndustries()
  const { addComment } = useComments()
  const {
    openSourcePanelId,
    openSourcePanel,
    openPostPanel,
    openPostPanelItem,
    panelHistory,
    openSource,
    openPost,
    back: panelBack,
    close: handleRemixPanelClose,
  } = usePanelStack(sources)
  const [connectingItem, setConnectingItem] = useState<SpaceItem | null>(null)
  const [pendingPost, setPendingPost] = useState<Post | null>(null)
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => setHasMounted(true), [])
  const [noteForSpace, setNoteForSpace] = useState<{ content: string; sourceRef?: string; commentId?: string } | null>(null)
  const [noteForSpaceNewName, setNoteForSpaceNewName] = useState('')

  // Only one inline panel open at a time.
  // Accepts LibrarySource | null to match the onOpenSourcePanel prop type expected by SpaceWorkspace.
  function openSourcePanelExclusive(src: LibrarySource | null, skipHistory = false) {
    if (src) openSource(src.id, skipHistory)
  }
  function openPostPanelExclusive(post: Post | null, item?: SpaceItem, skipHistory = false) {
    openPost(post, item, skipHistory)
  }
  function handleRemixPanelBack() {
    // Pass existence check — remix page only restores source panel if source still exists
    panelBack((id) => !!sources.find(s => s.id === id))
  }

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
    const newSource = sources.find(s => s.id === sourceId)
    const updates: Partial<SpaceItem> = {
      sourceRef: sourceId,
      cardRef: item.id,
      ...(item.postData && newSource ? {
        postData: { ...item.postData, sourceId, sourceName: newSource.name, sourceColor: newSource.color }
      } : {}),
    }
    if (item.type === 'note' && item.content) {
      const newCommentId = addComment(sourceId, item.content)
      updates.commentId = newCommentId
    }
    const gid = item.copyGroupId ?? item.id
    updateSpaceItemByGroupId(gid, updates)       // all Remix spaces
    updateSourceItemByGroupId(gid, updates)      // all source-spaces
    // Move in source-spaces if reassigning
    if (item.sourceRef && item.sourceRef !== sourceId) {
      moveSourceItemToSource(item.sourceRef, sourceId, item.id)
    }
    // Notes go to Analysis Notes via addComment only — never create a Piece
    if (item.type !== 'note') {
      const title = item.postData?.title ?? item.type
      const url = item.postData?.url ?? item.postRef?.url ?? ''
      addSourceCard(sourceId, { id: item.id, url, title, addedAt: item.addedAt })
    }
  }, [addComment, addSourceCard, removeSourceCard, sources, updateSpaceItemByGroupId, updateSourceItemByGroupId, moveSourceItemToSource])

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

  // Suppress unused variable warning — openSourcePanelId is used for reactive tracking
  void openSourcePanelId

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
                  onConvertToSource={() => convertSpaceToSource(space.id)}
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
                                onConvertToSource={convertSpaceToSource}
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
                              onConvertToSource={() => convertSpaceToSource(space.id)}
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
              onAddPieceToSpace={(spaceId, card) => {
                const src = openSourcePanel
                addPost(spaceId, {
                  id: card.id, title: card.title, url: card.url,
                  date: new Date(card.addedAt).toISOString(),
                  sourceId: src.id, sourceName: src.name, sourceColor: src.color,
                } as Post, { sourceRef: src.id, cardRef: card.id })
              }}
              onChangePieceSource={(card) => {
                const asItem: SpaceItem = spaces.flatMap(s => s.items).find(i => i.cardRef === card.id)
                  ?? { id: card.id, type: 'post' as const, postData: {
                      id: card.id, title: card.title, url: card.url,
                      date: new Date(card.addedAt).toISOString(),
                      sourceId: openSourcePanel.id, sourceName: openSourcePanel.name, sourceColor: openSourcePanel.color,
                    } as Post, cardRef: card.id, copyGroupId: card.id, sourceRef: openSourcePanel.id, addedAt: card.addedAt }
                setConnectingItem(asItem)
              }}
              onShowPieceOnAssociations={(card, targetSourceIds) => {
                const src = openSourcePanel
                const base: SpaceItem = {
                  id: card.id, type: 'post' as const,
                  postData: { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: src.id, sourceName: src.name, sourceColor: src.color } as Post,
                  copyGroupId: card.id, cardRef: card.id, sourceRef: src.id, addedAt: card.addedAt,
                }
                for (const sid of targetSourceIds) {
                  appendSourceItem(sid, { ...base, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` })
                  addSourceCard(sid, card)
                }
              }}
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
      <UndoBar />
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
