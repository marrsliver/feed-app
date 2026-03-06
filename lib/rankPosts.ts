import type { Post } from './types'

function recencyScore(date: string, now: number): number {
  const ageDays = (now - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return Math.exp(-ageDays / 10)
}

function engagementScore(commentCount: number): number {
  return Math.log1p(commentCount) / Math.log1p(1000)
}

// 60% recency + 40% engagement, dampened by source size for diversity,
// then greedy spread so no source repeats in the last 4 positions
export function rankPosts(posts: Post[]): Post[] {
  if (posts.length === 0) return posts
  const now = Date.now()

  const sourceCounts: Record<string, number> = {}
  for (const post of posts) {
    sourceCounts[post.sourceId] = (sourceCounts[post.sourceId] ?? 0) + 1
  }

  const scored = posts
    .map((post) => {
      const diversity = 1 / Math.sqrt(sourceCounts[post.sourceId])
      const score =
        (0.6 * recencyScore(post.date, now) + 0.4 * engagementScore(post.commentCount ?? 0)) *
        diversity
      return { post, score }
    })
    .sort((a, b) => b.score - a.score)

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
