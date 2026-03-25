'use client'

import { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, ChevronRight, ChevronDown, FolderOpen, Folder,
  Database, X,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { SourcePanel } from '@/components/SourcePanel'
import { AddLinkPanel } from '@/components/AddLinkPanel'
import { SourcePickerModal } from '@/components/SourcePickerModal'
import { PostPanel } from '@/components/PostPanel'
import { useSourceItems } from '@/hooks/useSourceItems'
import { useSpaces } from '@/hooks/useSpaces'
import { useLibrarySources } from '@/hooks/useLibrarySources'
import { useSourceCategories } from '@/hooks/useSourceCategories'
import { useSourceIndustries } from '@/hooks/useSourceIndustries'
import { useComments } from '@/hooks/useComments'
import { usePanelStack } from '@/hooks/usePanelStack'
import { UndoBar } from '@/components/UndoBar'
import { SourceSpaceWorkspace, SourceRow } from '@/components/source-spaces/SourceSpaceWorkspace'
import type { SpaceItem, LibrarySource, Post } from '@/lib/types'

// ── Session storage helpers for sidebar state ────────────────────────────────

const SS_INDUSTRIES_KEY = 'source-spaces-expanded-industries'
const SS_CATEGORIES_KEY = 'source-spaces-expanded-categories'

function readSSSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(sessionStorage.getItem(key) ?? '[]') as string[]) } catch { return new Set() }
}

function writeSSSet(key: string, s: Set<string>) {
  try { sessionStorage.setItem(key, JSON.stringify([...s])) } catch { /* ignore */ }
}

// ── Main page inner ───────────────────────────────────────────────────────────

function SourceSpacesPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { sources, setCategory, setIndustry, addTag, removeTag, renameSource, allTags, addSourceCard, removeSourceCard, addAssociation, removeAssociation, setSummary } = useLibrarySources()
  const { categories, createCategory } = useSourceCategories()
  const { industries, createIndustry } = useSourceIndustries()
  const { getItems, appendItem, removeItem, updateItem, reorderItems, updateItemByGroupId: updateSourceItemByGroupId, moveItemToSource: moveSourceItemToSource, getSourcesContainingGroupId } = useSourceItems()
  const { spaces, createSpace, appendItem: appendRemixItem, updateItemByGroupId: updateSpaceItemByGroupId } = useSpaces()
  const { addComment, deleteComment, editComment: editSourceComment, getComments } = useComments()

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [connectingItem, setConnectingItem] = useState<SpaceItem | null>(null)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [addLinkSourceId, setAddLinkSourceId] = useState<string | null>(null)
  const [noteForSpace, setNoteForSpace] = useState<{ content: string; sourceRef?: string; commentId?: string } | null>(null)
  const [noteForSpaceNewName, setNoteForSpaceNewName] = useState('')

  // Sidebar expand state (sessionStorage)
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(() => readSSSet(SS_INDUSTRIES_KEY))
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => readSSSet(SS_CATEGORIES_KEY))

  function toggleIndustry(id: string) {
    setExpandedIndustries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      writeSSSet(SS_INDUSTRIES_KEY, next)
      return next
    })
  }

  function toggleCategory(id: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      writeSSSet(SS_CATEGORIES_KEY, next)
      return next
    })
  }

  // Handle ?source=X deep-link
  const paramHandled = useRef(false)
  useEffect(() => {
    if (paramHandled.current) return
    const sourceId = searchParams.get('source')
    if (sourceId && sources.length > 0) {
      paramHandled.current = true
      setSelectedSourceId(sourceId)
    }
  }, [sources.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSource = selectedSourceId ? (sources.find(s => s.id === selectedSourceId) ?? null) : null
  const {
    openSourcePanelId,
    openSourcePanel,
    openPostPanel,
    openPostPanelItem,
    panelHistory,
    openSource: openSourcePanelFor,
    openPost: openPostPanelFor,
    back: handlePanelBack,
    close: handlePanelClose,
  } = usePanelStack(sources)

  // ── Merged items: derived (comments + pieces) + user-added ─────────────────
  const selectedSourceItems = useMemo(() => {
    if (!selectedSource) return []

    const comments = getComments(selectedSource.id)
    const commentItems: SpaceItem[] = comments.map(c => ({
      id: `comment-${c.id}`,
      type: 'note' as const,
      content: c.text,
      commentId: c.id,
      sourceRef: selectedSource.id,
      addedAt: c.createdAt,
    }))

    const cardItems: SpaceItem[] = (selectedSource.cards ?? []).map(card => ({
      id: `piece-${card.id}`,
      type: 'post' as const,
      refId: card.id,
      postData: {
        id: card.id,
        title: card.title,
        url: card.url,
        date: new Date(card.addedAt).toISOString(),
        sourceId: selectedSource.id,
        sourceName: selectedSource.name,
        sourceColor: selectedSource.color,
        excerpt: '',
      },
      cardRef: card.id,
      sourceRef: selectedSource.id,
      addedAt: card.addedAt,
    }))

    const userItems = getItems(selectedSource.id)
    return [
      ...[...commentItems, ...cardItems].sort((a, b) => b.addedAt - a.addedAt),
      ...userItems,
    ]
  }, [selectedSource, getComments, getItems])

  // Mutation routing — derived items route to source mutations; user items to useSourceItems
  function routeRemoveItem(itemId: string) {
    if (!selectedSourceId) return
    if (itemId.startsWith('comment-')) {
      deleteComment(selectedSourceId, itemId.slice(8))
    } else if (itemId.startsWith('piece-')) {
      removeSourceCard(selectedSourceId, itemId.slice(6))
    } else {
      removeItem(selectedSourceId, itemId)
    }
  }

  function routeUpdateItem(itemId: string, updates: Partial<SpaceItem>) {
    if (!selectedSourceId) return
    if (itemId.startsWith('comment-') && updates.content) {
      editSourceComment(selectedSourceId, itemId.slice(8), updates.content)
    } else if (!itemId.startsWith('comment-') && !itemId.startsWith('piece-')) {
      updateItem(selectedSourceId, itemId, updates)
    }
  }

  function routeReorderItems(items: SpaceItem[]) {
    if (!selectedSourceId) return
    const userItems = items.filter(i => !i.id.startsWith('comment-') && !i.id.startsWith('piece-'))
    reorderItems(selectedSourceId, userItems)
  }

  // Build sidebar tree
  const filteredSources = useMemo(() => {
    const q = sidebarSearch.toLowerCase().trim()
    return q ? sources.filter(s => s.name.toLowerCase().includes(q)) : sources
  }, [sources, sidebarSearch])

  const sourceTree = useMemo(() => {
    const industryMap = new Map<string, { byCategory: Map<string, LibrarySource[]>; uncategorized: LibrarySource[] }>()
    const noIndustry: LibrarySource[] = []

    for (const s of filteredSources) {
      if (!s.industryId) { noIndustry.push(s); continue }
      if (!industryMap.has(s.industryId)) industryMap.set(s.industryId, { byCategory: new Map(), uncategorized: [] })
      const group = industryMap.get(s.industryId)!
      if (s.categoryId) {
        if (!group.byCategory.has(s.categoryId)) group.byCategory.set(s.categoryId, [])
        group.byCategory.get(s.categoryId)!.push(s)
      } else {
        group.uncategorized.push(s)
      }
    }
    return { industryMap, noIndustry }
  }, [filteredSources])

  function handleDuplicateAsSpace() {
    if (!selectedSource) return
    const items = getItems(selectedSource.id)
    const spaceId = createSpace(selectedSource.name)
    for (const item of items) {
      appendRemixItem(spaceId, { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, addedAt: Date.now() })
    }
    router.push(`/remix?space=${spaceId}`)
  }

  const connectingItemRef = useRef(connectingItem)
  useEffect(() => { connectingItemRef.current = connectingItem }, [connectingItem])

  function handleConnectItemToSource(sourceId: string) {
    const item = connectingItemRef.current
    if (!item || !selectedSourceId) return
    setConnectingItem(null)
    if (item.sourceRef && item.sourceRef !== sourceId) removeSourceCard(item.sourceRef, item.cardRef ?? item.id)
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
    updateSpaceItemByGroupId(gid, updates)
    updateSourceItemByGroupId(gid, updates)
    if (item.sourceRef && item.sourceRef !== sourceId) {
      moveSourceItemToSource(item.sourceRef, sourceId, item.id)
    }
    if (item.type !== 'note') {
      const title = item.postData?.title ?? item.type
      const url = item.postData?.url ?? item.postRef?.url ?? ''
      addSourceCard(sourceId, { id: item.id, url, title, addedAt: item.addedAt })
    }
  }

  const commentToSpaces = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {}
    for (const space of spaces.filter(s => !s.deletedAt)) {
      for (const item of space.items) {
        if (item.type === 'note' && item.commentId) {
          map[item.commentId] ??= []
          if (!map[item.commentId].some(s => s.id === space.id)) map[item.commentId].push({ id: space.id, name: space.name })
        }
      }
    }
    return map
  }, [spaces])

  const totalCount = sources.length

  const sourceAppearsIn = useMemo(() => {
    const map: Record<string, LibrarySource[]> = {}
    for (const item of selectedSourceItems) {
      const gid = item.copyGroupId ?? item.id
      const sids = getSourcesContainingGroupId(gid).filter(s => s !== selectedSourceId)
      if (sids.length > 0)
        map[item.id] = sids.map(sid => sources.find(s => s.id === sid)).filter(Boolean) as LibrarySource[]
    }
    return map
  }, [selectedSourceItems, getSourcesContainingGroupId, selectedSourceId, sources])

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <Header activeFeed="source-spaces" sourcesCount={totalCount} />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {/* Left sidebar */}
        <aside className="w-[240px] border-r border-black/10 flex flex-col shrink-0 bg-white overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2.5 border-b border-black/10 shrink-0">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/25 pointer-events-none" />
              <input
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search sources…"
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-black/10 bg-white outline-none focus:border-black/30 transition-colors placeholder:text-black/25"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {/* Industries */}
            {industries.map((industry) => {
              const group = sourceTree.industryMap.get(industry.id)
              if (!group && !sidebarSearch) return null
              const allIndustrySources = group ? [...[...group.byCategory.values()].flat(), ...group.uncategorized] : []
              if (allIndustrySources.length === 0) return null
              const expanded = sidebarSearch ? true : expandedIndustries.has(industry.id)

              return (
                <div key={industry.id}>
                  <button
                    onClick={() => toggleIndustry(industry.id)}
                    className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-black/3 transition-colors text-left"
                  >
                    {expanded ? <ChevronDown size={11} className="text-black/30 shrink-0" /> : <ChevronRight size={11} className="text-black/30 shrink-0" />}
                    {expanded ? <FolderOpen size={12} className="text-black/40 shrink-0" /> : <Folder size={12} className="text-black/40 shrink-0" />}
                    <span className="text-xs font-medium text-black/60 truncate">{industry.name}</span>
                    <span className="text-[9px] text-black/25 ml-auto shrink-0">{allIndustrySources.length}</span>
                  </button>

                  {expanded && group && (
                    <div>
                      {[...group.byCategory.entries()].map(([catId, catSources]) => {
                        const cat = categories.find(c => c.id === catId)
                        const catLabel = cat?.name ?? catId
                        const catExpanded = sidebarSearch ? true : expandedCategories.has(`${industry.id}-${catId}`)
                        return (
                          <div key={catId} className="pl-4">
                            <button
                              onClick={() => toggleCategory(`${industry.id}-${catId}`)}
                              className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-black/3 transition-colors text-left"
                            >
                              {catExpanded ? <ChevronDown size={10} className="text-black/20 shrink-0" /> : <ChevronRight size={10} className="text-black/20 shrink-0" />}
                              <span className="text-[11px] text-black/40 truncate">{catLabel}</span>
                              <span className="text-[9px] text-black/20 ml-auto shrink-0">{catSources.length}</span>
                            </button>
                            {catExpanded && catSources.map(s => (
                              <div key={s.id} className="pl-6">
                                <SourceRow source={s} active={selectedSourceId === s.id} onClick={() => setSelectedSourceId(s.id)} />
                                {selectedSourceId === s.id && (s.associations ?? []).length > 0 && (
                                  <div className="ml-3 border-l border-black/10 pl-2 space-y-0.5 mt-0.5 mb-1">
                                    {(s.associations ?? []).map(assocId => {
                                      const assoc = sources.find(src => src.id === assocId)
                                      if (!assoc) return null
                                      return (
                                        <button
                                          key={assocId}
                                          onClick={() => setSelectedSourceId(assocId)}
                                          className={`w-full text-left flex items-center gap-1.5 px-2 py-1 text-[11px] transition-colors ${
                                            selectedSourceId === assocId
                                              ? 'text-black font-medium'
                                              : 'text-black/40 hover:text-black/70'
                                          }`}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: assoc.color }} />
                                          <span className="truncate">{assoc.name}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })}

                      {/* Uncategorized sources in this industry */}
                      {group.uncategorized.map(s => (
                        <div key={s.id} className="pl-4">
                          <SourceRow source={s} active={selectedSourceId === s.id} onClick={() => setSelectedSourceId(s.id)} />
                          {selectedSourceId === s.id && (s.associations ?? []).length > 0 && (
                            <div className="ml-3 border-l border-black/10 pl-2 space-y-0.5 mt-0.5 mb-1">
                              {(s.associations ?? []).map(assocId => {
                                const assoc = sources.find(src => src.id === assocId)
                                if (!assoc) return null
                                return (
                                  <button
                                    key={assocId}
                                    onClick={() => setSelectedSourceId(assocId)}
                                    className={`w-full text-left flex items-center gap-1.5 px-2 py-1 text-[11px] transition-colors ${
                                      selectedSourceId === assocId
                                        ? 'text-black font-medium'
                                        : 'text-black/40 hover:text-black/70'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: assoc.color }} />
                                    <span className="truncate">{assoc.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Sources with no industry — at bottom */}
            {sourceTree.noIndustry.length > 0 && (
              <div>
                {industries.length > 0 && (
                  <div className="px-3 py-1.5 mt-1 border-t border-black/6">
                    <span className="text-[9px] uppercase tracking-widest text-black/25 font-semibold">Other</span>
                  </div>
                )}
                {sourceTree.noIndustry.map(s => (
                  <div key={s.id}>
                    <SourceRow source={s} active={selectedSourceId === s.id} onClick={() => setSelectedSourceId(s.id)} />
                    {selectedSourceId === s.id && (s.associations ?? []).length > 0 && (
                      <div className="ml-3 border-l border-black/10 pl-2 space-y-0.5 mt-0.5 mb-1">
                        {(s.associations ?? []).map(assocId => {
                          const assoc = sources.find(src => src.id === assocId)
                          if (!assoc) return null
                          return (
                            <button
                              key={assocId}
                              onClick={() => setSelectedSourceId(assocId)}
                              className={`w-full text-left flex items-center gap-1.5 px-2 py-1 text-[11px] transition-colors ${
                                selectedSourceId === assocId
                                  ? 'text-black font-medium'
                                  : 'text-black/40 hover:text-black/70'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: assoc.color }} />
                              <span className="truncate">{assoc.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {filteredSources.length === 0 && (
              <p className="text-center py-10 text-xs text-black/25">{sidebarSearch ? 'No matches.' : 'No sources yet.'}</p>
            )}
          </div>
        </aside>

        {/* Main area + inline panels */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-[#fafafa] min-w-[480px]">
            {!selectedSource ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-black/25 space-y-3">
                <Database size={32} className="text-black/10" />
                <p className="text-sm">Select a source from the sidebar</p>
              </div>
            ) : (
              <SourceSpaceWorkspace
                key={selectedSource.id}
                source={selectedSource}
                items={selectedSourceItems}
                allSources={sources}
                allSpaces={spaces.filter(s => !s.deletedAt)}
                onAppendItem={(item) => appendItem(selectedSource.id, item)}
                onRemoveItem={routeRemoveItem}
                onUpdateItem={routeUpdateItem}
                onReorderItems={routeReorderItems}
                onAddLink={() => { setAddLinkSourceId(selectedSource.id); setAddLinkOpen(true) }}
                onOpenSourcePanel={() => openSourcePanelFor(selectedSource.id)}
                onOpenPostPanel={openPostPanelFor}
                onConnectItemToSource={setConnectingItem}
                onDuplicateAsSpace={handleDuplicateAsSpace}
                sourceAppearsIn={sourceAppearsIn}
              />
            )}
          </div>

          {/* Inline Post panel */}
          {openPostPanel && (
            <PostPanel
              inline
              post={openPostPanel}
              allSpaces={spaces}
              onAddNoteToSpaceId={(content, spaceId, commentId) => {}}
              onNavigateToSpace={() => {}}
              onBack={panelHistory.length > 0 ? handlePanelBack : undefined}
              onClose={handlePanelClose}
              onCreateSpace={() => {}}
              savedInSpaces={[]}
              commentToSpaces={commentToSpaces}
            />
          )}

          {/* Inline Source panel */}
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
              onSetSummary={setSummary}
              onAddNoteToSpace={(content, commentId) => setNoteForSpace({ content, sourceRef: openSourcePanel.id, commentId })}
              onBack={panelHistory.length > 0 ? handlePanelBack : undefined}
              onClose={handlePanelClose}
              onNavigateToSpace={() => {}}
              onCommentEdited={() => {}}
              onAddSourceCard={addSourceCard}
              onRemoveSourceCard={removeSourceCard}
              onOpenPiece={(post) => openPostPanelFor(post)}
              onAddSourceToSpace={() => {}}
              allSpaces={spaces.filter(s => !s.deletedAt)}
              savedLists={spaces.filter(s => !s.deletedAt)}
              commentToSpaces={commentToSpaces}
              allLibrarySources={sources}
              onAddAssociation={(targetId) => addAssociation(openSourcePanel.id, targetId)}
              onRemoveAssociation={(targetId) => removeAssociation(openSourcePanel.id, targetId)}
              onOpenAssociation={(src) => openSourcePanelFor(src.id)}
              onNavigateToSourceSpace={(src) => {
                setSelectedSourceId(src.id)
                handlePanelClose()
              }}
              onAddPieceToSpace={(spaceId, card) => {
                const src = openSourcePanel
                appendRemixItem(spaceId, {
                  type: 'post' as const, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  postData: { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: src.id, sourceName: src.name, sourceColor: src.color } as Post,
                  copyGroupId: card.id, cardRef: card.id, sourceRef: src.id, addedAt: card.addedAt,
                })
              }}
              onChangePieceSource={(card) => {
                const src = openSourcePanel
                const asItem: SpaceItem = {
                  id: card.id, type: 'post' as const,
                  postData: { id: card.id, title: card.title, url: card.url, date: new Date(card.addedAt).toISOString(), sourceId: src.id, sourceName: src.name, sourceColor: src.color } as Post,
                  cardRef: card.id, copyGroupId: card.id, sourceRef: src.id, addedAt: card.addedAt,
                }
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
                  appendItem(sid, { ...base, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` })
                  addSourceCard(sid, card)
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Source picker for connecting items */}
      {connectingItem && (
        <SourcePickerModal
          sources={sources}
          title="Link to source"
          onSelect={handleConnectItemToSource}
          onClose={() => setConnectingItem(null)}
        />
      )}

      {/* Add link panel */}
      {addLinkOpen && addLinkSourceId && (
        <AddLinkPanel
          feedId="source-spaces"
          onAdd={(post) => {
            appendItem(addLinkSourceId, { type: 'post', id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, refId: post.id, postData: post, addedAt: Date.now() })
            setAddLinkOpen(false)
            setAddLinkSourceId(null)
          }}
          onClose={() => { setAddLinkOpen(false); setAddLinkSourceId(null) }}
        />
      )}

      {/* Note for space modal */}
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
                {spaces.filter(s => !s.deletedAt).map(s => (
                  <button key={s.id} onClick={() => {
                    appendRemixItem(s.id, { type: 'note', id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, content: noteForSpace.content, sourceRef: noteForSpace.sourceRef, commentId: noteForSpace.commentId, addedAt: Date.now() })
                    setNoteForSpace(null)
                  }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 transition-colors text-black">
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
                      appendRemixItem(id, { type: 'note', id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, content: noteForSpace.content, sourceRef: noteForSpace.sourceRef, commentId: noteForSpace.commentId, addedAt: Date.now() })
                      setNoteForSpace(null)
                      setNoteForSpaceNewName('')
                    }
                  }}
                  placeholder="New space name…"
                  className="flex-1 text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                />
              </div>
            </div>
          </div>
        </>
      )}
      <UndoBar />
    </main>
  )
}

export default function SourceSpacesPage() {
  return (
    <Suspense fallback={null}>
      <SourceSpacesPageInner />
    </Suspense>
  )
}
