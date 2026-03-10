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

export interface LibrarySource {
  id: string
  name: string
  url: string
  feedUrl: string
  color: string
  type: 'rss' | 'wordpress' | 'custom' | 'scrape'
  apiPath?: string
  inFeed: boolean
  addedAt: number
  isStatic: boolean
  feedGroup?: string
  categoryId?: string
  tags: string[]
}

// Aliases for transition compatibility
export type Source = Pick<LibrarySource, 'id' | 'name' | 'url' | 'type' | 'color'> & {
  apiPath?: string
  feedUrl?: string
}
export type UserSource = LibrarySource

export interface SourceCategory {
  id: string
  name: string
}

export interface SourceList {
  id: string
  name: string
  sourceIds: string[]
  createdAt: number
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

export interface SavedList {
  id: string
  name: string
  postIds: string[]
  postData: Record<string, Post>
  createdAt: number
}
