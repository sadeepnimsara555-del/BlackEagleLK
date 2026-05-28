import { useMemo, useState, useRef, useEffect } from 'react'

function detectSubtitleIntent(userInput) {
  const input = userInput.toLowerCase()

  const subtitlePatterns = [
    'subtitle', 'subtitles', 'sub', 'subs',
    'sinhala sub', 'sinhala subtitle',
    'where to find', 'where can i get',
    'download sub', 'get subtitle',
    'sinhala translation', 'where subtitle',
    'sub file', 'srt file', 'srt',
    'how to get subtitle', 'find subtitle',
    'subtitle ekata', 'sub denna',
    'sinhala wada', 'subtitle koheda',
    'sub download', 'subtitle download',
    'උපසිරැසි', 'සිංහල උපසිරැසි',
  ]

  return subtitlePatterns.some((pattern) => input.includes(pattern))
}

function detectMovieTitle(userInput) {
  const titleMatch = userInput.match(/(?:for|of|movie|film)\s+["']?([^"'?]+)["']?/i)
  return titleMatch ? titleMatch[1].trim() : null
}

/* --- Advanced NLP helpers for entertainment intent detection --- */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function fuzzyMatchToken(token, keyword) {
  if (token === keyword) return true
  const dist = levenshtein(token, keyword)
  const len = Math.max(token.length, keyword.length)
  // tolerate small typos: allow up to 25% of length (min 1)
  return dist <= Math.max(1, Math.floor(len * 0.25))
}

// Common typo corrections for quick fixups
const TYPO_MAP = {
  horor: 'horror', romtic: 'romantic', funy: 'funny', animie: 'anime', thriler: 'thriller'
}

function fixTypos(text) {
  return text
    .split(/\s+/)
    .map(t => TYPO_MAP[t] || t)
    .join(' ')
}

// Alias map scalable structure
const ALIASES = [
  { id: 10749, tags: ['romance', 'love', 'romantic', 'relationship', 'dating', 'couple', 'heartbreak', 'romcom', 'valentine'] },
  { id: 35, tags: ['comedy', 'funny', 'laugh', 'hilarious', 'sitcom', 'entertaining'] },
  { id: 27, tags: ['horror', 'ghost', 'scary', 'creepy', 'demon', 'zombie', 'haunted', 'nightmare'] },
  { id: 878, tags: ['sci-fi', 'space', 'robot', 'ai', 'cyberpunk', 'alien', 'time travel', 'scifi'] },
  { id: 14, tags: ['fantasy', 'magic', 'dragon', 'wizard', 'supernatural'] },
  { id: 53, tags: ['thriller', 'mystery', 'suspense', 'detective', 'psychological', 'twist'] },
  { id: 16, tags: ['animation', 'anime', 'cartoon', 'pixar', 'disney', 'animated'] },
  { id: 28, tags: ['action', 'fight', 'battle', 'war', 'mission', 'superhero', 'spy'] },
  { id: 18, tags: ['drama', 'sad', 'emotional', 'tearjerker', 'real story'] },
  { id: 99, tags: ['documentary'] },
  { id: 80, tags: ['crime', 'gangster', 'mafia'] },
  { id: 12, tags: ['adventure', 'explore'] },
  { id: 10751, tags: ['family', 'kids', 'children'] },
]

const MOOD_MAP = {
  'feel good': 'feel_good', tearjerker: 'sad', sad: 'sad', 'mind bending': 'mind_bending', 'mind blowing': 'mind_bending', 'binge worthy': 'binge', 'plot twist': 'twist'
}

function tokenize(text) {
  return text.split(/\s+/).filter(Boolean)
}

function detectEntertainmentIntent(rawInput) {
  if (!rawInput || !rawInput.trim()) return { intent: false }
  let text = normalizeText(rawInput)
  text = fixTypos(text)

  const tokens = tokenize(text)

  // quick similarity/title detection
  const similarityMatch = rawInput.match(/(?:like|similar to|movies like)\s+["']?([^"']+)["']?/i)
  const title = similarityMatch ? similarityMatch[1].trim() : detectMovieTitle(rawInput)

  // detect platforms
  const platforms = []
  if (text.includes('netflix')) platforms.push('Netflix')
  if (text.includes('disney')) platforms.push('Disney')
  if (text.includes('hotstar')) platforms.push('Hotstar')
  if (text.includes('hbo') || text.includes('max')) platforms.push('HBO')

  // scoring genres via aliases + fuzzy tokens
  const genreScores = new Map()
  for (const g of ALIASES) genreScores.set(g.id, 0)

  for (const token of tokens) {
    for (const g of ALIASES) {
      for (const tag of g.tags) {
        if (token === tag || token.includes(tag) || fuzzyMatchToken(token, tag)) {
          genreScores.set(g.id, genreScores.get(g.id) + 2)
        }
      }
    }
  }

  // also check multi-word alias phrases
  for (const g of ALIASES) {
    for (const tag of g.tags) {
      if (text.includes(tag)) genreScores.set(g.id, genreScores.get(g.id) + 3)
    }
  }

  // pick top genres with score threshold
  const genres = [...genreScores.entries()]
    .filter(([, score]) => score > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

  // mood detection
  const moods = []
  for (const phrase in MOOD_MAP) {
    if (text.includes(phrase)) moods.push(MOOD_MAP[phrase])
  }

  // recommendation intent detection (words indicating user wants recs)
  const recWords = ['recommend', 'suggest', 'what to watch', 'something', 'anything', 'recommendation', 'suggestion', 'best', 'good']
  const wantsRec = recWords.some(w => text.includes(w)) || tokens.length <= 3

  // subtitles intent preserved separately
  const isEntertainment = genres.length > 0 || wantsRec || !!title || platforms.length > 0 || tokens.some(t => ['movie', 'film', 'cinema', 'watch', 'stream', 'watching'].includes(t))

  return {
    intent: !!isEntertainment,
    genres,
    moods,
    platforms,
    title,
    isSimilarity: !!similarityMatch,
    raw: text,
  }
}

/* --- Fetch helpers with retry/backoff --- */
async function fetchWithRetry(url, options = {}, retries = 2, backoff = 600) {
  try {
    const res = await fetch(url, options)
    if (!res.ok && retries > 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise(r => setTimeout(r, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 1.8)
    }
    return res
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 1.8)
    }
    throw e
  }
}

function detectMovieSearchIntent(userInput) {
  const input = userInput.toLowerCase().trim()

  const strictPatterns = [
    'show me movies', 'show me films',
    'find movies', 'find films',
    'recommend movies', 'recommend films',
    'suggest movies', 'suggest films',
    'horror movies', 'action movies',
    'comedy movies', 'thriller movies',
    'sci-fi movies', 'romantic movies',
    'animated movies', 'cartoon movies',
    'anime movies', 'drama movies',
    'best movies', 'top movies',
    'latest movies', 'new movies',
    'popular movies', 'trending movies',
    'movies like', 'films like',
    'similar movies', 'similar films',
    '2026 movies', '2025 movies',
    'movies in 2026', 'movies from 2026',
    'show me 2026', 'show me horror',
    'show me action', 'show me comedy',
    'show me thriller', 'show me romantic',
    'show me animated', 'show me cartoon',
    'show me anime', 'show me drama',
    'show me sci-fi', 'show me fantasy',
    'horror films', 'action films',
    'comedy films', 'bollywood movies',
    'sinhala movies', 'sri lanka movies',
    'old movies', 'classic movies',
    'award winning movies',
    'family movies', 'kids movies',
    'documentary movies',
  ]

  // If the input includes any strict pattern, treat as movie search
  if (strictPatterns.some(pattern => input.includes(pattern))) return true

  // Support single-word genre queries like "cartoon" or "anime"
  const singleGenres = ['cartoon', 'anime', 'horror', 'action', 'comedy', 'drama', 'romance', 'romantic', 'thriller', 'sci-fi', 'fantasy', 'documentary', 'kids', 'family']
  if (!input.includes(' ') && singleGenres.includes(input)) return true

  return false
}

async function searchMoviesFromQuery(userQuery, intent = {}) {
  const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
  const query = userQuery.toLowerCase()

  const yearMatch = query.match(/20[0-9]{2}/)
  const year = yearMatch ? yearMatch[0] : null

  // Ordered genre map - longer/more specific keyword lists first
  const genreMap = [
    { keywords: ['cartoon', 'animated', 'animation', 'anime', 'pixar', 'disney'], id: 16 },
    { keywords: ['horror', 'scary', 'frightening'], id: 27 },
    { keywords: ['action', 'fight', 'war'], id: 28 },
    { keywords: ['comedy', 'funny', 'humor', 'comic', 'laugh'], id: 35 },
    { keywords: ['romantic', 'romance', 'love'], id: 10749 },
    { keywords: ['thriller', 'suspense'], id: 53 },
    { keywords: ['drama'], id: 18 },
    { keywords: ['sci-fi', 'science fiction', 'space', 'robot'], id: 878 },
    { keywords: ['fantasy', 'magic', 'wizard'], id: 14 },
    { keywords: ['mystery', 'detective'], id: 9648 },
    { keywords: ['crime', 'gangster', 'mafia'], id: 80 },
    { keywords: ['adventure', 'explore'], id: 12 },
    { keywords: ['family', 'kids', 'children'], id: 10751 },
    { keywords: ['documentary'], id: 99 },
  ]

  let genreId = null
  for (const genre of genreMap) {
    if (genre.keywords.some(kw => query.includes(kw))) {
      genreId = genre.id
      break
    }
  }

  // Handle "movies like X" recommendations
  const similarMatch = query.match(/(?:like|similar to|movies like)\s+(.+)/i)
  if (similarMatch) {
    const searchTitle = similarMatch[1].trim()
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchTitle)}`
    )
    const searchData = await searchRes.json()
    if (searchData.results?.[0]) {
      const movieId = searchData.results[0].id
      const recRes = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${TMDB_KEY}`
      )
      const recData = await recRes.json()
      return recData.results?.slice(0, 6) || []
    }
    return []
  }

  // Build discover query with safer defaults and random page to reduce repeated identical results
  const randomPage = Math.floor(Math.random() * 5) + 1
  let discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&sort_by=popularity.desc&vote_count.gte=100&page=${randomPage}`

  // if intent provides genres (from NLP), use those higher priority
  if (intent.genres && intent.genres.length > 0) {
    discoverUrl += `&with_genres=${intent.genres.join(',')}`
  } else if (genreId) {
    discoverUrl += `&with_genres=${genreId}`
  }
  if (year) discoverUrl += `&primary_release_year=${year}`

  if (query.includes('top rated') || query.includes('best')) {
    discoverUrl = discoverUrl.replace('popularity.desc', 'vote_average.desc')
    discoverUrl += '&vote_count.gte=300'
  }

  if (query.includes('latest') || query.includes('new') || query.includes('recent') || query.includes('2026')) {
    const currentYear = new Date().getFullYear()
    if (!year) discoverUrl += `&primary_release_year=${currentYear}`
  }

  const res = await fetchWithRetry(discoverUrl, {}, 2, 600)
  const data = await res.json()
  return data.results?.slice(0, 6) || []
}

const SUBTITLE_SITES = [
  {
    name: 'Subz.lk',
    url: 'https://subz.lk',
    flag: '🇱🇰',
    description: 'Largest Sinhala subtitle collection. Search by movie name and download .srt file.',
    quality: 'Best',
    qualityColor: '#22c55e',
    tags: ['Most Popular', 'Updated Daily'],
    searchUrl: 'https://subz.lk/?s=',
  },
  {
    name: 'Cineru.lk',
    url: 'https://cineru.lk',
    flag: '🇱🇰',
    description: 'Very active community with Sinhala subs for latest movies and TV shows.',
    quality: 'Great',
    qualityColor: '#22c55e',
    tags: ['Latest Movies', 'TV Shows'],
    searchUrl: 'https://cineru.lk/?s=',
  },
  {
    name: 'BaiscopeLK',
    url: 'https://www.baiscope.lk',
    flag: '🇱🇰',
    description: 'Popular Sri Lankan subtitle site with wide collection of Sinhala subs.',
    quality: 'Good',
    qualityColor: '#f59e0b',
    tags: ['Wide Collection'],
    searchUrl: 'https://www.baiscope.lk/?s=',
  },
  {
    name: 'Subscene',
    url: 'https://subscene.com',
    flag: '🌐',
    description: 'International subtitle site. Search movie name and filter by Sinhala language.',
    quality: 'Limited',
    qualityColor: '#f59e0b',
    tags: ['International', 'Filter by Sinhala'],
    searchUrl: 'https://subscene.com/subtitles/searchbytitle?query=',
  },
  {
    name: 'OpenSubtitles',
    url: 'https://www.opensubtitles.org',
    flag: '🌐',
    description: 'Worlds largest subtitle database. Limited Sinhala but worth checking.',
    quality: 'Limited',
    qualityColor: '#ef4444',
    tags: ['Huge Database', 'Limited Sinhala'],
    searchUrl: 'https://www.opensubtitles.org/en/search/sublanguageid-sin/moviename-',
  },
]

const WELCOME_SUGGESTIONS = [
  '🎬 Show me 2026 horror movies',
  '💥 Best action movies this year',
  '😂 Popular comedy movies',
  '🔥 Trending movies right now',
  '🇱🇰 Where to find Sinhala subtitles?',
  '📥 Subtitle for The Mummy',
  '🚀 Latest sci-fi movies',
  '❤️ Best romantic movies',
]

function SubtitleSiteCard({ site, movieTitle }) {
  const searchLink = movieTitle ? site.searchUrl + encodeURIComponent(movieTitle) : site.url
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.015))',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '10px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.6)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#0f0f0f', display: 'grid', placeItems: 'center', fontSize: 20 }}>
            <span style={{ lineHeight: 1 }}>{site.flag}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{site.name}</div>
            <div style={{ fontSize: 12, color: '#9a9a9a' }}>{site.description}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: site.qualityColor, background: `${site.qualityColor}15`, padding: '6px 10px', borderRadius: 20, border: `1px solid ${site.qualityColor}33` }}>{site.quality}</div>
          <div style={{ fontSize: 11, color: '#9a9a9a' }}>{site.tags.join(' • ')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {site.tags.map(tag => (
            <span key={tag} style={{ fontSize: 11, color: '#cfcfcf', background: '#0f0f0f', padding: '6px 8px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.03)' }}>{tag}</span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={site.url} target="_blank" rel="noreferrer" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#e6e6e6', padding: '8px 12px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>
            ↗ Visit
          </a>
          {movieTitle && (
            <a href={searchLink} target="_blank" rel="noreferrer" style={{ background: '#e50914', color: '#fff', padding: '8px 12px', borderRadius: 10, textDecoration: 'none', fontWeight: 800 }}>
              🔍 Search
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatMovieCard({ movie }) {
  const year = movie.release_date?.split('-')[0]
  const rating = movie.vote_average?.toFixed(1)
  const IMG = 'https://image.tmdb.org/t/p/w200'

  return (
    <div
      onClick={() => window.location.href = `/movie/${movie.id}`}
      style={{
        display: 'flex',
        gap: '10px',
        background: '#111',
        border: '1px solid #1e1e1e',
        borderRadius: '10px',
        padding: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '8px',
        alignItems: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#e50914'
        e.currentTarget.style.background = '#161616'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1e1e1e'
        e.currentTarget.style.background = '#111'
      }}
    >
      {movie.poster_path ? (
        <img
          src={`${IMG}${movie.poster_path}`}
          alt={movie.title}
          style={{
            width: '46px',
            height: '69px',
            borderRadius: '6px',
            objectFit: 'cover',
            flexShrink: 0
          }}
        />
      ) : (
        <div style={{
          width: '46px',
          height: '69px',
          borderRadius: '6px',
          background: '#1a1a1a',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>🎬</div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {movie.title}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#555',
          marginTop: '3px',
          display: 'flex',
          gap: '8px'
        }}>
          {year && <span>{year}</span>}
          {rating && (
            <span style={{ color: '#f59e0b' }}>★ {rating}</span>
          )}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#777',
          marginTop: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {movie.overview?.slice(0, 60)}...
        </div>
      </div>

      <div style={{
        background: '#e50914',
        color: 'white',
        fontSize: '11px',
        fontWeight: 700,
        padding: '5px 10px',
        borderRadius: '6px',
        flexShrink: 0
      }}>
        ▶ Watch
      </div>
    </div>
  )
}

function ChatbotLogo() {
  return (
    <img
      src="/img/logo.png"
      alt="Black Eagle logo"
      style={{
        width: '22px',
        height: '22px',
        objectFit: 'contain',
        display: 'block',
        borderRadius: '50%',
      }}
    />
  )
}

function SmartChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      type: 'text',
      content: 'Hi I am Black Eagle, How can I help you to find a movie? 🎬',
      showInlineLogo: true
    },
  ])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth' 
    })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setShowWelcome(true)
      }, 150)

      return () => clearTimeout(timer)
    }

    setShowWelcome(false)
    return undefined
  }, [isOpen])

  const quickSuggestions = useMemo(() => WELCOME_SUGGESTIONS, [])

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion)
    setIsOpen(true)
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userText = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', type: 'text', content: userText }])
    setIsLoading(true)

    try {
      const intent = detectEntertainmentIntent(userText)

      if (detectSubtitleIntent(userText)) {
        const detectedTitle = detectMovieTitle(userText)
        setMessages(prev => [...prev,
          {
            role: 'assistant',
            type: 'text',
            content: detectedTitle
              ? `Here are the best sites to find Sinhala subtitles for "${detectedTitle}" 🇱🇰`
              : 'Here are the best sites to find Sinhala subtitles 🇱🇰'
          },
          {
            role: 'assistant',
            type: 'subtitles',
            movieTitle: detectedTitle
          }
        ])
        setIsLoading(false)
        return
      }

      if (intent.intent) {
        const movies = await searchMoviesFromQuery(userText, intent)
        if (movies.length > 0) {
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last && last.type === 'movies') {
              const lastIds = (last.movies || []).map(m => m.id).join(',')
              const newIds = (movies || []).map(m => m.id).join(',')
              if (lastIds === newIds) return prev
            }

            if ((!intent.genres || intent.genres.length === 0) && (!intent.title && !intent.isSimilarity)) {
              return [...prev,
                { role: 'assistant', type: 'text', content: 'I think you want recommendations — here are trending and top-rated picks.' },
                { role: 'assistant', type: 'movies', movies }
              ]
            }

            return [...prev,
              { role: 'assistant', type: 'text', content: `Here are some movies I found for you! 🎬` },
              { role: 'assistant', type: 'movies', movies }
            ]
          })
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            type: 'text',
            content: 'I could not find movies matching that. Try "show me 2026 horror movies" or "best action movies".'
          }])
        }
        setIsLoading(false)
        return
      }

      // Non-entertainment or ambiguous -> fallback to Gemini
      const conversationHistory = messages
        .filter(m => m.type === 'text')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: typeof m.content === 'string' ? m.content : (m.text || '') }] }))

      conversationHistory.push({ role: 'user', parts: [{ text: userText }] })

      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: `You are Black Eagle 🦅, a friendly movie assistant for BlackEagleLK, a Sri Lankan streaming website.\n\nYou help users:\n- Find and learn about movies\n- Answer questions about films, actors, directors\n- Suggest what to watch\n- Help with Sinhala subtitles\n\nRules:\n- Keep answers short and friendly (2-3 sentences)\n- If user asks for movie lists say: \n  "Try typing show me [genre] movies and I will find them for you!"\n- If user asks about subtitles say: \n  "Try typing subtitle for [movie name] and I will show you the best sites!"\n- Reply in the SAME language the user writes in\n- If user writes in Sinhala reply in Sinhala\n- Always be helpful and friendly\n- You are Black Eagle not an AI assistant` }] },
            contents: conversationHistory
          })
        },
        2,
        600
      )

      if (response.status === 429) {
        setMessages(prev => [...prev, { role: 'assistant', type: 'text', content: 'The AI service is temporarily rate-limited. Please wait a moment and try again, or ask for movie lists like "show me action movies".' }])
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', type: 'text', content: 'Something went wrong with the AI service. Please try again later.' }])
        setIsLoading(false)
        return
      }

      const data = await response.json()
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry I could not understand that. Try asking about a movie!'
      setMessages(prev => [...prev, { role: 'assistant', type: 'text', content: aiText }])

    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', type: 'text', content: 'Something went wrong. Please try again!' }])
    } finally {
      setIsLoading(false)
    }
  }

  const dotBounceStyle = `
  @keyframes dotBounce {
    0%, 80%, 100% { transform: translateY(0) }
    40% { transform: translateY(-6px) }
  }

  @keyframes welcomeFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`

  return (
    <div style={{ position: 'fixed', right: '20px', bottom: '20px', zIndex: 60 }}>
      <style>{dotBounceStyle}</style>
      {isOpen && (
        <div
          style={{
            width: 'min(92vw, 380px)',
            maxHeight: '70vh',
            marginBottom: '12px',
            background: 'rgba(12, 12, 12, 0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '18px',
            boxShadow: '0 18px 60px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(135deg, rgba(229,9,20,0.18), rgba(229,9,20,0.04))',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChatbotLogo />
                <span>Black Eagle</span>
              </div>
              <div style={{ fontSize: '11px', color: '#b5b5b5' }}>Your personal movie assistant</div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                {msg.type === 'text' && (
                  <div
                    style={{
                      maxWidth: '90%',
                      padding: '10px 12px',
                      borderRadius: '14px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      color: msg.role === 'user' ? '#fff' : '#dedede',
                      background: msg.role === 'user' ? '#e50914' : '#151515',
                      border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      animation: index === 0 && msg.role === 'assistant' && showWelcome
                        ? 'welcomeFadeIn 0.55s ease-out both'
                        : 'none',
                    }}
                  >
                    {msg.showInlineLogo ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>Hi I am Black Eagle</span>
                        <ChatbotLogo />
                        <span>, How can I help you to find a movie? 🎬</span>
                      </span>
                    ) : (
                      msg.content
                    )}
                  </div>
                )}

                {msg.type === 'subtitles' && (
                  <div style={{ width: '100%' }}>
                    {SUBTITLE_SITES.map((site) => (
                      <SubtitleSiteCard key={site.name} site={site} movieTitle={msg.movieTitle} />
                    ))}

                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 6, borderRadius: 6, background: '#e50914', height: '100%', minHeight: 56 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            padding: '10px 12px',
                            borderRadius: 12,
                            background: '#0b0f12',
                            border: '1px solid rgba(229,9,20,0.06)',
                            color: '#d0d0d0',
                            fontSize: 13,
                            lineHeight: 1.6
                          }}>
                            <div style={{ fontWeight: 800, color: '#fff', marginBottom: 8, fontSize: 13 }}>How to use</div>
                            <div style={{ color: '#bdbdbd' }}>
                              <div>Click a site above to open its subtitle page.</div>
                              <div>Download the .srt file that matches the movie.</div>
                              <div>Go to the movie page on BlackEagleLK and upload the .srt file.</div>
                              <div>Enjoy the movie with subtitles.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {msg.type === 'movies' && (
                  <div style={{ width: '100%' }}>
                    {msg.movies.map(movie => (
                      <ChatMovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                width: '100%'
              }}>
                <div style={{
                  background: '#151515',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#555',
                      animation: 'dotBounce 1.2s infinite',
                      animationDelay: `${i * 0.2}s`
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              padding: '12px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage()
                  }
                }}
                placeholder="Ask about movies or Sinhala subtitles..."
                style={{
                  flex: 1,
                  background: '#141414',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '11px 12px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  background: (!input.trim() || isLoading)
                    ? '#333' : '#e50914',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: (!input.trim() || isLoading)
                    ? 'not-allowed' : 'pointer',
                  opacity: (!input.trim() || isLoading) ? 0.6 : 1
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Open chat"
          style={{
            position: 'relative',
            width: isOpen ? '60px' : '146px',
            height: '56px',
            padding: isOpen ? '0' : '0 16px 0 12px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)), linear-gradient(135deg, rgba(239,22,36,0.98), rgba(127,9,16,0.96))',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 18px 38px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.03) inset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'center' : 'flex-start',
            gap: isOpen ? '0' : '12px',
            backdropFilter: 'blur(14px)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 24px 46px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.04) inset'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '0 18px 38px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.03) inset'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
          }}
        >
          <span
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(10,10,12,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <ChatbotLogo />
          </span>

          {!isOpen && (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05, minWidth: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>Ask AI</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap' }}>Movie help</span>
            </span>
          )}

          {!isOpen && (
            <span
              aria-hidden="true"
              style={{
                marginLeft: 'auto',
                fontSize: '16px',
                color: 'rgba(255,255,255,0.88)',
                transform: 'translateY(-1px)',
              }}
            >
              ›
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

export default SmartChatbot