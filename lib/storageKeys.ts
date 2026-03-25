/**
 * Central registry for all localStorage keys used in this app.
 * Import from here instead of hardcoding strings in hooks —
 * prevents silent data-loss from typos and makes key audits easy.
 */
export const LS_KEYS = {
  // Data caches (DB fallbacks)
  COMMENTS:            'comments_cache_v1',
  DELETED_POSTS:       'deleted_posts_cache_v1',
  LIBRARY_SOURCES:     'library_sources_cache_v1',
  SOURCE_ASSOCIATIONS: 'source_associations_v1',
  MANUAL_POSTS:        'manual_posts_cache_v1',
  SOURCE_CATEGORIES:   'source_categories_cache_v1',
  SOURCE_INDUSTRIES:   'source_industries_cache_v1',
  SOURCE_LISTS:        'source_lists_cache_v1',
  USER_SOURCES:        'user_sources_cache_v1',

  // Local-only state
  SOURCE_SPACE_ITEMS:  'source_space_items_v1',
  SPACE_FOLDERS:       'space_folders_v1',
  SIDEBAR_ORDER:       'sidebar_order_v1',
  SPACES:              'saved_lists_cache_v1',
  SPACES_TRASH:        'spaces_trash_v1',
  SPACES_DELETED_IDS:  'spaces_deleted_ids_v1',

  // Write queue
  PENDING_WRITES:      'pending_writes_v2',
} as const
