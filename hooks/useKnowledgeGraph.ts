import { useMemo } from 'react'
import { useLibrarySources } from './useLibrarySources'
import { useSpaces } from './useSpaces'
import type { SpaceItem, Space } from '@/lib/types'

type EntryRef = { item: SpaceItem; space: Space }

export type SourceGraph = {
  notes: EntryRef[]
  posts: EntryRef[]
  sourceItems: EntryRef[]
}

export type CardGraph = {
  notes: EntryRef[]
}

const EMPTY_SOURCE: SourceGraph = { notes: [], posts: [], sourceItems: [] }
const EMPTY_CARD: CardGraph = { notes: [] }

export function useKnowledgeGraph() {
  const { spaces } = useSpaces()

  const { bySource, byCard, byPost } = useMemo(() => {
    const bySource: Record<string, SourceGraph> = {}
    const byCard: Record<string, CardGraph> = {}
    const byPost: Record<string, { space: Space }[]> = {}

    for (const space of spaces) {
      for (const item of space.items) {
        if (item.type === 'note' && item.sourceRef) {
          bySource[item.sourceRef] ??= { notes: [], posts: [], sourceItems: [] }
          bySource[item.sourceRef].notes.push({ item, space })
          if (item.cardRef) {
            byCard[item.cardRef] ??= { notes: [] }
            byCard[item.cardRef].notes.push({ item, space })
          }
        }
        if (item.type === 'post' && item.postData?.sourceId) {
          const sid = item.postData.sourceId
          bySource[sid] ??= { notes: [], posts: [], sourceItems: [] }
          bySource[sid].posts.push({ item, space })
        }
        if (item.type === 'post' && item.postData) {
          const pid = item.postData.id
          byPost[pid] ??= []
          byPost[pid].push({ space })
        }
        if (item.type === 'source' && item.refId) {
          bySource[item.refId] ??= { notes: [], posts: [], sourceItems: [] }
          bySource[item.refId].sourceItems.push({ item, space })
        }
      }
    }

    return { bySource, byCard, byPost }
  }, [spaces])

  return {
    getSourceConnections: (id: string): SourceGraph =>
      bySource[id] ?? EMPTY_SOURCE,
    getCardConnections: (id: string): CardGraph =>
      byCard[id] ?? EMPTY_CARD,
    getPostSpaces: (postId: string): { space: Space }[] =>
      byPost[postId] ?? [],
  }
}
