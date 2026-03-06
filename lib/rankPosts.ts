import type { Post } from './types'

export type SortMode = 'relevance' | 'popular'

function recencyScore(date: string, now: number): number {
  const ageDays = (now - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return Math.exp(-ageDays / 10)
}

function engagementScore(commentCount: number): number {
  return Math.log1p(commentCount) / Math.log1p(1000)
}


export function rankPosts(posts: Post[], mode: SortMode = 'relevance'): Post[] {
  if (posts.length === 0) return posts
  const now = Date.now()

  switch (mode) {
    case 'relevance': {
      // Count posts per source so prolific sources get dampened
      const sourceCounts: Record<string, number> = {}
      for (const post of posts) {
        sourceCounts[post.sourceId] = (sourceCounts[post.sourceId] ?? 0) + 1
      }

      // 60% recency + 40% engagement, multiplied by 1/sqrt(sourceCount) for diversity
      const scored = posts
        .map((post) => {
          const diversity = 1 / Math.sqrt(sourceCounts[post.sourceId])
          const score =
            (0.6 * recencyScore(post.date, now) + 0.4 * engagementScore(post.commentCount ?? 0)) *
            diversity
          return { post, score }
        })
        .sort((a, b) => b.score - a.score)

      // Greedy spread: no source repeats in the last 4 positions
      const result: Post[] = []
      const remaining = [...scored]
      while (remaining.length > 0) {
        const recentSources = new Set(result.slice(-4).map((p) => p.sourceId))
        let idx = remaining.findIndex((s) => !recentSources.has(s.post.sourceId))
        if (idx === -1) idx = 0
        result.push(remaining.splice(idx, 1)[0].post)
      }
      return result
    }

    case 'popular': {
      // Only posts that actually have engagement data, sorted by comment count desc
      const withEngagement = posts.filter((p) => p.commentCount && p.commentCount > 0)
      return [...withEngagement].sort((a, b) => {
        const diff = (b.commentCount ?? 0) - (a.commentCount ?? 0)
        if (diff !== 0) return diff
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
    }

  }
}
