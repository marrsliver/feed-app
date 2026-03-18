'use client'

import { useState, useRef, useEffect } from 'react'
import { FileText, X, Pencil, History, RotateCcw, ChevronDown, ChevronRight, Link2, Database } from 'lucide-react'
import type { SpaceItem, SpaceItemVersion, Post, LibrarySource } from '@/lib/types'

interface Props {
  item: SpaceItem
  onRemove: () => void
  onUpdate: (updates: Partial<SpaceItem>) => void
  onOpenSource?: (sourceId: string) => void
  onOpenPost?: (post: Post) => void
  onConnectToSource?: () => void
  onDisconnectSource?: () => void
  onNoteEdited?: (commentId: string, newText: string) => void
  sourceName?: string
  sourceColor?: string
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function NoteItemCard({ item, onRemove, onUpdate, onOpenSource, onOpenPost, onConnectToSource, onDisconnectSource, onNoteEdited, sourceName, sourceColor }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.content ?? '')
  const [confirming, setConfirming] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) textareaRef.current?.focus() }, [editing])
  useEffect(() => { if (!editing) setDraft(item.content ?? '') }, [item.content, editing])

  function saveEdit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === item.content) { setEditing(false); return }
    const newVersion: SpaceItemVersion = { content: item.content ?? '', editedAt: Date.now() }
    const versions = [newVersion, ...(item.versions ?? [])]
    onUpdate({ content: trimmed, versions })
    if (item.commentId) onNoteEdited?.(item.commentId, trimmed)
    setEditing(false)
  }

  function restore(version: SpaceItemVersion) {
    const newVersion: SpaceItemVersion = { content: item.content ?? '', editedAt: Date.now() }
    const versions = [newVersion, ...(item.versions ?? []).filter((v) => v.editedAt !== version.editedAt)]
    onUpdate({ content: version.content, versions })
    setDraft(version.content)
    setHistoryOpen(false)
  }


  return (
    <div
      className="bg-amber-50/60 border border-amber-200/70 relative"
      style={{ boxShadow: '0 0 0 1px rgba(251,191,36,0.08)' }}
    >
      <div className="p-4">
        <div className="flex items-start gap-2">
          <FileText size={13} className="text-amber-400/60 mt-0.5 shrink-0" />

          {editing ? (
            <div className="flex-1 space-y-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit()
                  if (e.key === 'Escape') { setDraft(item.content ?? ''); setEditing(false) }
                }}
                rows={4}
                className="w-full text-sm border border-amber-200 px-2 py-1.5 resize-none outline-none focus:border-amber-400 transition-colors bg-white/70 leading-relaxed"
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="text-xs bg-black text-white px-3 py-1 hover:bg-black/80 transition-colors">Save</button>
                <button onClick={() => { setDraft(item.content ?? ''); setEditing(false) }} className="text-xs text-black/40 hover:text-black px-2 py-1 transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-black/80 leading-relaxed flex-1 whitespace-pre-wrap">{item.content}</p>
          )}

          {!editing && (
            <div className="flex flex-col gap-0.5 shrink-0">
              {confirming ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-black/40">Remove?</span>
                  <button onClick={onRemove} className="text-[10px] text-red-500 font-medium px-1">Yes</button>
                  <button onClick={() => setConfirming(false)} className="text-[10px] text-black/40 px-1">No</button>
                </div>
              ) : (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing(true)} className="p-0.5 text-black/25 hover:text-black transition-colors" aria-label="Edit">
                    <Pencil size={11} />
                  </button>
                  {onConnectToSource && (
                    <button
                      onClick={onConnectToSource}
                      className={`p-0.5 transition-colors ${item.sourceRef ? 'text-black/50 hover:text-black' : 'text-black/25 hover:text-black'}`}
                      aria-label={item.sourceRef ? 'Change source connection' : 'Connect to source'}
                      title={item.sourceRef ? `Connected to source — click to change` : 'Connect to source'}
                    >
                      <Database size={11} />
                    </button>
                  )}
                  <button onClick={() => setConfirming(true)} className="p-0.5 text-black/25 hover:text-black transition-colors" aria-label="Remove">
                    <X size={11} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 ml-5">
          <p className="text-[9px] text-black/25 tracking-widest uppercase">{formatDate(item.addedAt)}</p>
          {(item.versions?.length ?? 0) > 0 && (
            <button
              onClick={() => setHistoryOpen((p) => !p)}
              className="flex items-center gap-0.5 text-[9px] text-black/25 hover:text-black/50 transition-colors uppercase tracking-wide"
            >
              <History size={9} />
              {item.versions!.length} {item.versions!.length === 1 ? 'edit' : 'edits'}
              {historyOpen ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
            </button>
          )}
        </div>

        {/* Link source CTA — shown when note has no source yet */}
        {!item.sourceRef && onConnectToSource && (
          <div className="mt-2 ml-5">
            <button onClick={onConnectToSource}
              className="flex items-center gap-1 text-[9px] text-black/30 hover:text-black/60 transition-colors">
              <Database size={9} />Link to source
            </button>
          </div>
        )}

        {/* Source connection chip */}
        {item.sourceRef && sourceName && (
          <div className="mt-2 ml-5 flex items-center gap-1.5 group/source">
            <span
              className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10"
              style={{ backgroundColor: sourceColor ?? '#6366f1' }}
            />
            <button
              onClick={() => item.sourceRef && onOpenSource?.(item.sourceRef)}
              className="text-[9px] font-medium text-black/50 hover:text-black transition-colors truncate max-w-[140px]"
              title="Open source"
            >
              {sourceName}
            </button>
            {onDisconnectSource && (
              confirmDisconnect ? (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => { onDisconnectSource(); setConfirmDisconnect(false) }} className="text-[9px] text-red-400 hover:text-red-600 font-medium transition-colors">Disconnect</button>
                  <button onClick={() => setConfirmDisconnect(false)} className="text-[9px] text-black/25 hover:text-black/50 px-0.5 transition-colors">×</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDisconnect(true)}
                  className="text-[9px] text-black/20 hover:text-black/50 transition-colors opacity-0 group-hover/source:opacity-100 shrink-0"
                  title="Disconnect from source"
                >×</button>
              )
            )}
          </div>
        )}

        {/* Post back-reference (when note was added from a post) */}
        {item.postRef && item.postRef.title && (
          <div className="mt-2 ml-5">
            <button
              onClick={() => item.postRef && onOpenPost?.(item.postRef)}
              className="inline-flex items-center gap-1 text-[9px] text-black/35 hover:text-black/70 transition-colors"
              title="Open original post"
            >
              <Link2 size={8} />
              <span className="truncate max-w-[160px]">{item.postRef.title.length > 40 ? item.postRef.title.slice(0, 40) + '…' : item.postRef.title}</span>
            </button>
          </div>
        )}
      </div>

      {/* Version history */}
      {historyOpen && item.versions && item.versions.length > 0 && (
        <div className="border-t border-amber-200/50 bg-black/[0.02] px-4 py-3 space-y-3">
          <p className="text-[9px] uppercase tracking-widest text-black/30 font-semibold">Edit history</p>
          {item.versions.map((v, i) => (
            <div key={v.editedAt} className="group/v space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-black/30 uppercase tracking-wide">{formatDateTime(v.editedAt)}</span>
                <button
                  onClick={() => restore(v)}
                  className="opacity-0 group-hover/v:opacity-100 flex items-center gap-1 text-[9px] text-black/40 hover:text-black transition-all"
                >
                  <RotateCcw size={9} />Restore
                </button>
              </div>
              <p className="text-xs text-black/50 leading-relaxed line-clamp-3 whitespace-pre-wrap">{v.content}</p>
              {i < item.versions!.length - 1 && <div className="border-b border-black/5 pt-1" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
