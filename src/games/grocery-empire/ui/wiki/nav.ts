/** Where the wiki is. The site maps this to `/guide/grocery-empire/...`; the in-game drawer keeps it in state. */
export type WikiView = 'home' | 'article' | 'topic' | 'learn' | 'atlas' | 'glossary' | 'hubs' | 'search'

export interface WikiNav {
  view: WikiView
  /** Article id, topic id, lesson id (learn), era number (atlas) or glossary id. */
  id?: string
  q?: string
}

const BASE = '/guide/grocery-empire'

export function navToPath(n: WikiNav): string {
  switch (n.view) {
    case 'home':
      return BASE
    case 'article':
      return `${BASE}/a/${n.id ?? ''}`
    case 'topic':
      return `${BASE}/topic/${n.id ?? ''}`
    case 'learn':
      return n.id ? `${BASE}/learn/${n.id}` : `${BASE}/learn`
    case 'atlas':
      return n.id ? `${BASE}/atlas/${n.id}` : `${BASE}/atlas`
    case 'glossary':
      return n.id ? `${BASE}/glossary/${n.id}` : `${BASE}/glossary`
    case 'hubs':
      return `${BASE}/hubs`
    case 'search':
      return `${BASE}/search?q=${encodeURIComponent(n.q ?? '')}`
  }
}

/** Parse the part after `/guide/:gameId/`. Old `?a=` links still land on the article. */
export function pathToNav(rest: string, search: URLSearchParams): WikiNav {
  const [head, id] = rest.split('/').filter(Boolean)
  switch (head) {
    case 'a':
      return id ? { view: 'article', id } : { view: 'home' }
    case 'topic':
      return id ? { view: 'topic', id } : { view: 'home' }
    case 'learn':
      return { view: 'learn', id }
    case 'atlas':
      return { view: 'atlas', id }
    case 'glossary':
      return { view: 'glossary', id }
    case 'hubs':
      return { view: 'hubs' }
    case 'search':
      return { view: 'search', q: search.get('q') ?? '' }
    default: {
      const a = search.get('a')
      return a ? { view: 'article', id: a } : { view: 'home' }
    }
  }
}
