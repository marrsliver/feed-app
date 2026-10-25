'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 767px)'

function subscribe(cb: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

// null during SSR/hydration so callers can avoid flashing the wrong layout
export function useIsMobile(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null,
  )
}
