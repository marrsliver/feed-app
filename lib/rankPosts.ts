import type { Post } from './types'

export type SortMode = 'relevance' | 'recency' | 'popular' | 'unpopular'

function recencyScore(date: string, now: number): number {
  const ageDays = (now - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return Math.exp(-ageDays / 10)
}

function engagementScore(commentCount: number): number {
  return Math.log1p(commentCount) / Math.log1p(1000)
}

// Greedy spread: no source repeats in the last `window` positions
function spreadBySource(posts: Post[], window = 2): Post[] {
  const result: Post[] = []
  const remaining = [...posts]
  while (remaining.length > 0) {
    const recentSources = new Set(result.slice(-window).map((p) => p.sourceId))
    let idx = remaining.findIndex((p) => !recentSources.has(p.sourceId))
    if (idx === -1) idx = 0
    result.push(remaining.splice(idx, 1)[0])
  }
  return result
}

export function rankPosts(posts: Post[], mode: SortMode = 'relevance'): Post[] {
  if (posts.length === 0) return posts
  const now = Date.now()

  switch (mode) {
    case 'relevance': {
      // 60% recency + 40% engagement, then source spread
      const scored = posts
        .map((post) => ({
          post,
          score: 0.6 * recencyScore(post.date, now) + 0.4 * engagementScore(post.commentCount ?? 0),
        }))
        .sort((a, b) => b.score - a.score)

      const result: Post[] = []
      const remaining = [...scored]
      while (remaining.length > 0) {
        const recentSources = new Set(result.slice(-2).map((p) => p.sourceId))
        let idx = remaining.findIndex((s) => !recentSources.has(s.post.sourceId))
        if (idx === -1) idx = 0
        result.push(remaining.splice(idx, 1)[0].post)
      }
      return result
    }

    case 'recency': {
      // Newest first, with source spread
      const sorted = [...posts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      return spreadBySource(sorted)
    }

    case 'popular': {
      // Purely by engagement — most commented first, recency as tiebreaker
      // Posts with no engagement data fall to the bottom
      return [...posts].sort((a, b) => {
        const aCount = a.commentCount ?? 0
        const bCount = b.commentCount ?? 0
        if (bCount !== aCount) return bCount - aCount
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
    }

    case 'unpopular': {
      // Only posts with zero (or no) engagement data, newest first with source spread
      const noEngagement = posts.filter((p) => !p.commentCount || p.commentCount === 0)
      const sorted = [...noEngagement].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      return spreadBySource(sorted)
    }
  }
}
