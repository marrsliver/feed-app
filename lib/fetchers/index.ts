import type { Source, FetcherResult } from '../types'
import { fetchWordPress } from './wordpress'
import { fetchRSS } from './rss'
import { fetchScrape } from './scrape'
import { fetchForensicArchitecture } from './forensic-architecture'
import { fetchEflux } from './eflux'
import { fetchFieldProjects } from './field-projects'
import { fetchNTS } from './nts'
import { fetchMixcloud } from './mixcloud'

// Custom fetchers keyed by source ID
const customFetchers: Record<
  string,
  (source: Source, page: number) => Promise<FetcherResult>
> = {
  'forensic-architecture': fetchForensicArchitecture,
  'eflux': fetchEflux,
  'field-projects': fetchFieldProjects,
  'nts': fetchNTS,
  'oroko': fetchMixcloud,
}

export async function fetchSource(
  source: Source,
  page: number
): Promise<FetcherResult> {
  switch (source.type) {
    case 'wordpress':
      return fetchWordPress(source, page)
    case 'rss':
      return fetchRSS(source, page)
    case 'scrape':
      return fetchScrape(source, page)
    case 'custom': {
      const fetcher = customFetchers[source.id]
      if (fetcher) return fetcher(source, page)
      // Fallback to scrape if no custom fetcher registered
      return fetchScrape(source, page)
    }
    default:
      return { posts: [], hasMore: false }
  }
}
