import type { Post } from './types'

function recencyScore(date: string, now: number): number {
  const ageDays = (now - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return Math.exp(-ageDays / 10)
}

function engagementScore(commentCount: number): number {
  return Math.log1p(commentCount) / Math.log1p(1000)
}

// Simple seeded LCG random — deterministic per seed
function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

// Engagement × diversity only (no recency), greedy spread.
// Optional seed: when provided, applies a seeded Fisher-Yates shuffle to the result
// so each seed value produces a distinct stable ordering.
export function rankPostsDiversified(posts: Post[], seed?: number): Post[] {
  if (posts.length === 0) return posts

  const sourceCounts: Record<string, number> = {}
  for (const post of posts) {
    sourceCounts[post.sourceId] = (sourceCounts[post.sourceId] ?? 0) + 1
  }

  const scored = posts
    .map((post) => {
      const diversity = 1 / Math.sqrt(sourceCounts[post.sourceId])
      const score = engagementScore(post.commentCount ?? 0) * diversity
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

  if (seed !== undefined) {
    const rand = seededRandom(seed)
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]]
    }
  }

  return result
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
