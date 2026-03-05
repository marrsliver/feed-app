import type { Source } from './types'

export const sources: Source[] = [
  {
    id: 'forensic-architecture',
    name: 'Forensic Architecture',
    url: 'https://forensic-architecture.org',
    type: 'custom',
    color: '#e63946',
    apiPath: '/api/fa/v1/investigations',
  },
  {
    id: 'art21',
    name: 'Art21',
    url: 'https://art21.org',
    type: 'wordpress',
    color: '#6366f1',
    apiPath: '/wp-json/wp/v2/posts',
  },
  {
    id: 'artforum',
    name: 'Artforum',
    url: 'https://www.artforum.com',
    type: 'wordpress',
    color: '#000000',
    apiPath: '/wp-json/wp/v2/posts',
  },
  {
    id: 'democracy-now',
    name: 'Democracy Now!',
    url: 'https://www.democracynow.org',
    type: 'rss',
    color: '#b45309',
    feedUrl: 'https://www.democracynow.org/democracynow.rss',
  },
  {
    id: 'lithub',
    name: 'Literary Hub',
    url: 'https://lithub.com',
    type: 'wordpress',
    color: '#0f766e',
    apiPath: '/wp-json/wp/v2/posts',
  },
  {
    id: 'eflux',
    name: 'e-flux',
    url: 'https://www.e-flux.com',
    type: 'custom',
    color: '#525252',
  },
]

export function getSourceById(id: string): Source | undefined {
  return sources.find((s) => s.id === id)
}
