export interface Post {
  id: string
  title: string
  url: string
  image?: string
  excerpt?: string
  date: string
  sourceId: string
  sourceName: string
  sourceColor: string
  commentCount?: number
}

export interface Source {
  id: string
  name: string
  url: string
  type: 'rss' | 'wordpress' | 'custom' | 'scrape'
  color: string
  apiPath?: string
  feedUrl?: string
}

export interface FetcherResult {
  posts: Post[]
  nextPage?: number
  hasMore: boolean
}

export interface PostsApiResponse {
  posts: Post[]
  nextPage?: number
  hasMore: boolean
}

export interface Comment {
  id: string
  postId: string
  text: string
  createdAt: number
}

export interface UserSource {
  id: string
  name: string
  url: string      // website URL (for display/linking)
  feedUrl: string  // RSS/Atom URL (for fetching)
  color: string
  inFeed: boolean  // whether to pull posts into the feed
  addedAt: number
}

export interface SavedList {
  id: string
  name: string
  postIds: string[]
  createdAt: number
}
