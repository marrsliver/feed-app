'use client'

import { useState, useEffect } from 'react'
import { lsGet, lsSet } from '@/lib/localStorage'

/**
 * Fetches data from a URL, caches to localStorage, and falls back to cache on error/empty.
 * Returns [data, setData] — setData lets callers mutate local state after CRUD operations.
 */
export function useCachedAPI<T>(
  url: string,
  cacheKey: string,
  fallback: T,
  // Optional: custom check for whether API data is valid (default: Array.isArray && length > 0)
  isValid?: (data: unknown) => boolean,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [data, setData] = useState<T>(() => lsGet<T>(cacheKey) ?? fallback)

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then((fresh: unknown) => {
        const valid = isValid ? isValid(fresh) : (Array.isArray(fresh) && (fresh as unknown[]).length > 0)
        if (valid) {
          lsSet(cacheKey, fresh)
          setData(fresh as T)
        } else {
          const cached = lsGet<T>(cacheKey)
          if (cached != null) setData(cached)
        }
      })
      .catch(() => {
        const cached = lsGet<T>(cacheKey)
        if (cached != null) setData(cached)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [data, setData]
}
