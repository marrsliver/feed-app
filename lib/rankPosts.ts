import type { Post } from './types'

// Exponential decay: score = 1.0 at publish time, ~0.5 at 7 days, ~0.1 at 23 days
function recencyScore(date: string, now: number): number {
  const ageDays = (now - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return Math.exp(-ageDays / 10)
}

// Log scale: 0 comments → 0, 10 → 0.37, 100 → 0.74, 1000 → 1.0
function engagementScore(commentCount: number): number {
  return Math.log1p(commentCount) / Math.log1p(1000)
}

export function rankPosts(posts: Post[]): Post[] {
  if (posts.length === 0) return posts

  const now = Date.now()

  // Score each post: 60% recency + 40% engagement
  const scored = posts
    .map((post) => ({
      post,
      score:
        0.6 * recencyScore(post.date, now) +
        0.4 * engagementScore(post.commentCount ?? 0),
    }))
    .sort((a, b) => b.score - a.score)

  // Spread: greedily pick the highest-scoring post that isn't from
  // the same source as the last two picked. Fall back to best available
  // if no cross-source candidate exists.
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
