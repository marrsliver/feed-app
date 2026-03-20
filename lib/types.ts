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

// A manually-curated link pinned to a specific source
export interface SourceCard {
  id: string
  url: string
  title: string
  addedAt: number
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
  industryId?: string
  tags: string[]
  summary?: string
  cards?: SourceCard[]
  associations?: string[]  // IDs of other sources this source is associated with
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

export interface SourceIndustry {
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

export type SpaceItemType = 'post' | 'note' | 'source' | 'space' | 'media' | 'divider' | 'text'

export interface SpaceItemVersion {
  content: string
  editedAt: number
}

export interface SpaceItem {
  type: SpaceItemType
  id: string
  refId?: string
  postData?: Post
  content?: string              // text for notes; URL for media
  mediaType?: 'image' | 'video' | 'audio'
  itemHeight?: number           // free-form resize height in px (all types)
  mediaHeight?: number          // legacy alias — use itemHeight going forward
  itemSpan?: 1 | 2 | 3         // column span in grid (1=default, 2=wide, 3=full)
  sourceRef?: string            // source ID back-ref (notes from source panels)
  cardRef?: string              // SourceCard ID — when note is connected to a specific card
  commentId?: string        // comment ID when note originated from a source comment
  postRef?: Post                // post back-ref (notes from article panels)
  copyGroupId?: string          // shared across copies; used for "appears in" lookup
  versions?: SpaceItemVersion[] // edit history for notes
  posX?: number               // absolute x position for floating text items
  posY?: number               // absolute y position for floating text items
  addedAt: number
}

export interface Space {
  id: string
  name: string
  description?: string
  tags?: string[]
  items: SpaceItem[]
  createdAt: number
  updatedAt?: number
  deletedAt?: number      // set when soft-deleted to trash; unset on restore
  // legacy migration fields
  postIds?: string[]
  postData?: Record<string, Post>
}

export type SavedList = Space

export interface SpaceFolder {
  id: string
  name: string
  spaceIds: string[]
  createdAt: number
  deletedAt?: number
}
