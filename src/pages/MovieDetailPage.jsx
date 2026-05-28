import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  getMovieDetails,
  getMovieCredits,
  getMovieRecommendations,
  IMG_BASE,
  BACKDROP_BASE,
} from '../api/tmdb'
import MovieCard from '../components/MovieCard'
import MovieCardSkeleton from '../components/MovieCardSkeleton'

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

/** Convert an SRT timestamp like "00:01:23,456" → seconds (83.456) */
function srtTimestampToSeconds(ts) {
  const [h, m, rest] = ts.split(':')
  const s = rest.replace(',', '.')
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s)
}

/** Parse raw SRT text into an array of { start, end, text } cues */
function parseSrt(raw) {
  // Normalise line‑endings
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = text.split(/\n\n+/).filter(Boolean)
  const cues = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    // Find the line with the timestamp arrow
    const tsIndex = lines.findIndex((l) => l.includes('-->'))
    if (tsIndex === -1) continue
    const [startTs, endTs] = lines[tsIndex].split('-->').map((s) => s.trim())
    const content = lines
      .slice(tsIndex + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '') // strip HTML‑style tags
      .trim()
    if (!content) continue
    cues.push({
      start: srtTimestampToSeconds(startTs),
      end: srtTimestampToSeconds(endTs),
      text: content,
    })
  }
  return cues
}

/** Format seconds → mm:ss */
function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatRuntime(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return ''
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

function getReleaseYear(releaseDate) {
  if (!releaseDate) return ''
  const year = new Date(releaseDate).getFullYear()
  return Number.isNaN(year) ? '' : String(year)
}

/* ──────────────────────────────────────────────
   Icons (inline SVGs so we don't need a dep)
   ────────────────────────────────────────────── */
const ClockIcon = () => (
  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)
const CalendarIcon = () => (
  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const UserIcon = () => (
  <svg className="w-8 h-8 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
  </svg>
)
/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function MovieDetailPage() {
  const { id } = useParams()
  const recsRef = useRef(null)

  const scrollRecs = (direction) => {
    const container = recsRef.current
    if (!container) return
    const amount = direction === 'left' ? -540 : 540
    container.scrollBy({ left: amount, behavior: 'smooth' })
  }

  // Data states
  const [movie, setMovie] = useState(null)
  const [credits, setCredits] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Subtitle states
  const [subtitleCues, setSubtitleCues] = useState([])
  const [currentSubtitle, setCurrentSubtitle] = useState('')
  const [isSubPlaying, setIsSubPlaying] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [subtitleFileLoaded, setSubtitleFileLoaded] = useState(false)
  const [subtitleFileName, setSubtitleFileName] = useState('')
  const timerRef = useRef(null)

  // Custom UI and offset state
  const [isUploadHovered, setIsUploadHovered] = useState(false)
  const [subtitleOffset, setSubtitleOffset] = useState(0)
  const [subtitleFontSize, setSubtitleFontSize] = useState(22)
  const [subtitleTextColor, setSubtitleTextColor] = useState('#ffffff')
  const [subtitleBackgroundColor, setSubtitleBackgroundColor] = useState('transparent')
  const [isSubtitleStyleOpen, setIsSubtitleStyleOpen] = useState(false)
  const lastIframeUpdateRef = useRef(0)

  // Fullscreen detection
  const [isFullscreen, setIsFullscreen] = useState(false)
  const playerContainerRef = useRef(null)

  // Tracks the player's bounding rect so the portal subtitle stays aligned with the player
  const [subtitlePos, setSubtitlePos] = useState({ bottom: 70, left: '50%', maxWidth: '85vw' })

  // Server selector state
  const [activeServer, setActiveServer] = useState('server1')

  const servers = [
    { id: 'server1', label: '🎬 Server 1', getUrl: (imdb) => `https://vidsrc.me/embed/movie/${imdb}` },
    { id: 'server2', label: '🎬 Server 2', getUrl: (imdb) => `https://multiembed.mov/directstream.php?video_id=${imdb}` },
    { id: 'server3', label: '🎬 Server 3', getUrl: (imdb) => `https://autoembed.co/movie/imdb/${imdb}` },
  ]

  /* ── Fetch data ── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [detailsRes, creditsRes, recsRes] = await Promise.all([
        getMovieDetails(id),
        getMovieCredits(id),
        getMovieRecommendations(id),
      ])
      setMovie(detailsRes.data)
      setCredits(creditsRes.data)
      setRecommendations(recsRes.data.results || [])
    } catch (err) {
      setError(err.message || 'Something went wrong while fetching movie data.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Reset subtitle state on movie change
    clearInterval(timerRef.current)
    setSubtitleCues([])
    setCurrentSubtitle('')
    setIsSubPlaying(false)
    setElapsedTime(0)
    setSubtitleOffset(0)
    setSubtitleFileLoaded(false)
    setSubtitleFileName('')
    setIsSubtitleStyleOpen(false)
    lastIframeUpdateRef.current = 0
    fetchData()

    return () => clearInterval(timerRef.current)
  }, [id, fetchData])

  // Toggle our container into/out of fullscreen
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      playerContainerRef.current.requestFullscreen().catch(() => {})
    }
  }

  // Track fullscreen changes.
  // We manage fullscreen state based on whether our custom player container
  // is the active fullscreen element.
  useEffect(() => {
    const onFullscreenChange = () => {
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement

      setIsFullscreen(fsEl === playerContainerRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
    document.addEventListener('mozfullscreenchange', onFullscreenChange)
    document.addEventListener('msfullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
      document.removeEventListener('mozfullscreenchange', onFullscreenChange)
      document.removeEventListener('msfullscreenchange', onFullscreenChange)
    }
  }, [])

  // Listen to message events from the embedded video player iframe
  useEffect(() => {
    const handleMessage = (event) => {
      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          // Ignore non-JSON strings
        }
      }

      if (payload && typeof payload === 'object') {
        let updatedTime = null;
        let isPlayingMsg = null;

        // 1. Vidlink.pro PLAYER_EVENT
        if (payload.type === 'PLAYER_EVENT' && payload.data) {
          const { event: evName, currentTime } = payload.data;
          if (typeof currentTime === 'number') {
            updatedTime = currentTime;
          }
          if (evName === 'play') isPlayingMsg = true;
          if (evName === 'pause') isPlayingMsg = false;
        }
        // 2. VidSrc MEDIA_DATA
        else if (payload.type === 'MEDIA_DATA' && payload.data) {
          const progress = payload.data.progress;
          if (progress) {
            const watched = progress.watched_time || progress.watchedTime;
            if (typeof watched === 'number') {
              updatedTime = watched;
            }
          }
          isPlayingMsg = true; // If we get progress data, it's playing
        }
        // 3. General standard player event structures (player.js, jwplayer, etc.)
        else {
          const evName = payload.event || payload.type;
          if (evName === 'play' || evName === 'playing') isPlayingMsg = true;
          if (evName === 'pause' || evName === 'paused') isPlayingMsg = false;

          if (typeof payload.currentTime === 'number') {
            updatedTime = payload.currentTime;
          } else if (typeof payload.seconds === 'number') {
            updatedTime = payload.seconds;
          } else if (typeof payload.time === 'number') {
            updatedTime = payload.time;
          } else if (payload.value && typeof payload.value.seconds === 'number') {
            updatedTime = payload.value.seconds;
          } else if (payload.data && typeof payload.data.currentTime === 'number') {
            updatedTime = payload.data.currentTime;
          } else if (payload.data && typeof payload.data.seconds === 'number') {
            updatedTime = payload.data.seconds;
          }
        }

        if (updatedTime !== null) {
          lastIframeUpdateRef.current = Date.now();
          setElapsedTime(Math.floor(updatedTime));
        }
        if (isPlayingMsg !== null) {
          setIsSubPlaying(isPlayingMsg);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Effect-driven subtitle timer (manually ticking if isSubPlaying is true)
  useEffect(() => {
    if (isSubPlaying && subtitleCues.length > 0) {
      clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1 + subtitleOffset
          const cue = subtitleCues.find((c) => newTime >= c.start && newTime <= c.end)
          setCurrentSubtitle(cue ? cue.text : '')
          return prev + 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isSubPlaying, subtitleCues, subtitleOffset])

  /* ── Subtitle helper controls ── */
  const startSubtitle = useCallback(() => {
    if (!subtitleCues.length) return
    setIsSubPlaying(true)
  }, [subtitleCues])

  const pauseSubtitle = useCallback(() => {
    setIsSubPlaying(false)
  }, [])

  const resetSubtitle = useCallback(() => {
    setIsSubPlaying(false)
    setElapsedTime(0)
    setSubtitleOffset(0)
    setCurrentSubtitle('')
  }, [])

  const handleSubtitleFile = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const raw = ev.target.result
      const cues = parseSrt(raw)
      // Load cues and reset offset, timing will automatically sync from iframe events
      setIsSubPlaying(false)
      setElapsedTime(0)
      setSubtitleOffset(0)
      setCurrentSubtitle('')
      setSubtitleFileName(file.name)
      setSubtitleFileLoaded(true)
      setIsSubtitleStyleOpen(false)
      setSubtitleCues(cues)
    }
    reader.readAsText(file)
  }, [])

  // Derived current subtitle cue sync
  useEffect(() => {
    if (!subtitleCues.length) {
      setCurrentSubtitle('')
      return
    }
    const adjustedTime = elapsedTime + subtitleOffset
    const cue = subtitleCues.find((c) => adjustedTime >= c.start && adjustedTime <= c.end)
    setCurrentSubtitle(cue ? cue.text : '')
  }, [elapsedTime, subtitleOffset, subtitleCues])

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        {/* Backdrop skeleton */}
        <div className="relative h-[70vh] skeleton" />

        <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
          {/* Title skeleton */}
          <div className="h-10 w-96 skeleton" />
          <div className="h-5 w-72 skeleton" />
          <div className="flex gap-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-full skeleton" />
            ))}
          </div>
          <div className="space-y-3 mt-6">
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-5/6 skeleton" />
            <div className="h-4 w-4/6 skeleton" />
          </div>

          {/* Cast skeleton */}
          <div className="h-6 w-24 skeleton mt-10" />
          <div className="flex gap-6 mt-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full skeleton" />
                <div className="h-3 w-14 skeleton" />
              </div>
            ))}
          </div>

          {/* Player skeleton */}
          <div className="h-8 w-48 skeleton mt-10" />
          <div className="aspect-video w-full skeleton rounded-xl mt-4" />

          {/* Recommendations skeleton */}
          <div className="h-8 w-64 skeleton mt-10" />
          <div className="flex gap-4 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-44">
                <MovieCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center animate-fade-in-up space-y-6 px-4">
          <div className="text-6xl">😵</div>
          <h2 className="text-2xl font-bold text-text-primary">Oops! Something went wrong</h2>
          <p className="text-text-secondary max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!movie) return null

  const cast = credits?.cast?.slice(0, 8) || []
  const recs = recommendations.slice(0, 12)
  const heroBackdropUrl = movie.backdrop_path ? `${BACKDROP_BASE}${movie.backdrop_path}` : ''
  const heroPosterUrl = movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : ''
  const heroGenres = movie.genres || []
  const heroRating = Number(movie.vote_average || 0)
  const heroRuntime = formatRuntime(movie.runtime)
  const heroReleaseYear = getReleaseYear(movie.release_date)
  const filledStars = Math.max(0, Math.min(5, Math.round(heroRating / 2)))

  const scrollToPlayer = () => {
    document.getElementById('player-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <style>{`
        .movie-hero-overview {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
          -webkit-line-clamp: 3;
        }

        .movie-section-heading {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .movie-section-heading-bar {
          width: 4px;
          height: 28px;
          background: #e50914;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .movie-section-heading-title {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .movie-cast-card {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.2s ease;
          cursor: default;
        }

        .movie-cast-card:hover {
          transform: translateY(-4px);
          border-color: #2a2a2a;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .movie-hero-watch-btn {
          transition: all 0.2s ease;
        }

        .movie-hero-watch-btn:hover {
          background: #c4000f !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(229, 9, 20, 0.45) !important;
        }

        @media (max-width: 768px) {
          .movie-hero-content {
            flex-direction: column;
            align-items: flex-start;
            padding: 24px 20px 32px !important;
            gap: 20px !important;
            min-height: auto !important;
          }

          .movie-hero-poster {
            width: 120px !important;
          }

          .movie-hero-poster img,
          .movie-hero-poster-placeholder {
            width: 120px !important;
            height: 180px !important;
          }

          .movie-hero-title {
            font-size: 24px !important;
          }

          .movie-hero-overview {
            -webkit-line-clamp: 4;
          }

          .movie-hero-meta {
            gap: 10px !important;
            font-size: 13px !important;
          }

          .movie-hero-actions {
            width: 100%;
          }

          .movie-hero-watch-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <div className="min-h-screen bg-bg-primary text-text-primary">
        {/* ═══════════════════════════════════════════
            1. CINEMATIC HERO
            ═══════════════════════════════════════════ */}
        <section
          className="relative w-full overflow-hidden"
          style={{
            minHeight: '480px',
            marginBottom: 0,
            backgroundColor: '#0f0f0f',
          }}
        >
          {heroBackdropUrl && (
            <img
              src={heroBackdropUrl}
              alt={`${movie.title} backdrop`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
                filter: 'brightness(0.35)',
                zIndex: 0,
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(15,15,15,0.2) 0%, rgba(15,15,15,0.5) 40%, rgba(15,15,15,0.92) 80%, #0f0f0f 100%)',
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(15,15,15,0.95) 0%, rgba(15,15,15,0.6) 40%, transparent 70%)',
              zIndex: 1,
            }}
          />

          <div
            className="movie-hero-content relative z-[2] mx-auto flex w-full max-w-7xl items-end gap-9 px-12 pb-12 pt-[60px]"
            style={{ minHeight: '480px' }}
          >
            <div className="movie-hero-poster flex-shrink-0 w-[180px]">
              {heroPosterUrl ? (
                <img
                  src={heroPosterUrl}
                  alt={movie.title}
                  style={{
                    width: '180px',
                    height: '270px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.8), 0 8px 20px rgba(0,0,0,0.6)',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  className="movie-hero-poster-placeholder flex items-center justify-center bg-[#111] text-[#666]"
                  style={{
                    width: '180px',
                    height: '270px',
                    borderRadius: '12px',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.8), 0 8px 20px rgba(0,0,0,0.6)',
                  }}
                >
                  No Poster
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-3 pb-1">
              {heroGenres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {heroGenres.map((genre) => (
                    <span
                      key={genre.id}
                      style={{
                        background: 'rgba(229,9,20,0.15)',
                        border: '1px solid rgba(229,9,20,0.3)',
                        color: '#e50914',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '4px',
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              <h1
                className="movie-hero-title m-0 font-extrabold leading-[1.1] text-white"
                style={{
                  fontSize: 'clamp(28px, 4vw, 48px)',
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                }}
              >
                {movie.title}
              </h1>

              {movie.tagline?.trim() && (
                <p className="m-0 text-[15px] font-normal italic text-white/45">
                  {movie.tagline}
                </p>
              )}

              <div className="movie-hero-meta flex flex-wrap items-center gap-4 text-[14px] text-[#888]">
                <span className="flex items-center gap-1.5">
                  <span style={{ color: '#f59e0b', fontSize: '16px' }}>★</span>
                  <span style={{ color: '#f59e0b', fontSize: '15px', fontWeight: 700 }}>
                    {heroRating ? heroRating.toFixed(1) : '0.0'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#555' }}>/10</span>
                </span>

                {heroRuntime && (
                  <>
                    <span style={{ width: '3px', height: '3px', background: '#333', borderRadius: '50%', display: 'inline-block' }} />
                    <span className="flex items-center gap-1.5">
                      <ClockIcon />
                      {heroRuntime}
                    </span>
                  </>
                )}

                {heroReleaseYear && (
                  <>
                    <span style={{ width: '3px', height: '3px', background: '#333', borderRadius: '50%', display: 'inline-block' }} />
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon />
                      {heroReleaseYear}
                    </span>
                  </>
                )}

                {movie.original_language && (
                  <>
                    <span style={{ width: '3px', height: '3px', background: '#333', borderRadius: '50%', display: 'inline-block' }} />
                    <span
                      style={{
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {movie.original_language}
                    </span>
                  </>
                )}
              </div>

              {movie.overview && (
                <p
                  className="movie-hero-overview m-0 max-w-[640px] text-[15px] leading-[1.7] text-white/65"
                  style={{ WebkitBoxOrient: 'vertical' }}
                >
                  {movie.overview}
                </p>
              )}

              <div className="movie-hero-actions mt-1 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={scrollToPlayer}
                  className="movie-hero-watch-btn flex items-center gap-2 rounded-lg border-none bg-[#e50914] text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(229,9,20,0.35)]"
                  style={{ cursor: 'pointer', padding: '14px 32px' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#c4000f'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e50914'
                  }}
                >
                  <span aria-hidden="true">▶</span>
                  Watch Now
                </button>

                <div
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '1px' }}>
                      TMDB
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <span
                          key={index}
                          style={{
                            fontSize: '12px',
                            color: index < filledStars ? '#f59e0b' : '#333',
                            lineHeight: 1,
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b' }}>
                    {heroRating ? heroRating.toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            2. WATCH NOW — PLAYER SECTION
            ═══════════════════════════════════════════ */}
        <section id="player-section" className="w-full bg-black animate-fade-in-up flex flex-col items-center pt-6">
        {/* Server selector */}
        <div className="w-full max-w-5xl px-4 pb-4 flex flex-col items-start">
          <label style={{
            fontSize: '11px',
            color: '#555',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '8px',
            fontWeight: 600
          }}>
            Select Server
          </label>
          <div style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: '50px',
            padding: '6px',
            display: 'inline-flex',
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            {servers.map((server) => {
              const isActive = activeServer === server.id;
              const cleanLabel = server.label.replace('🎬', '').trim();
              return (
                <button
                  key={server.id}
                  onClick={() => setActiveServer(server.id)}
                  style={{
                    background: isActive ? '#e50914' : 'transparent',
                    color: isActive ? 'white' : '#888',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#1a1a1a';
                      e.currentTarget.style.color = '#ccc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#888';
                    }
                  }}
                >
                  <span style={{
                    fontSize: '8px',
                    color: isActive ? 'white' : '#444',
                    transition: 'color 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}>●</span>
                  {cleanLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Constrain player width so it's not too huge */}
        <div className="w-full max-w-5xl px-4 pb-6">
          <div
            ref={playerContainerRef}
            style={{
              background: '#000',
              borderRadius: isFullscreen ? '0' : '12px',
              overflow: 'visible',
              border: isFullscreen ? 'none' : '1px solid #1a1a1a',
              boxShadow: isFullscreen ? 'none' : '0 25px 60px rgba(0,0,0,0.8)',
              position: 'relative',
              transformStyle: 'preserve-3d',
              // When we are the fullscreen element the browser forces us to
              // fill the viewport; height:100% ensures children also fill it.
              height: isFullscreen ? '100%' : 'auto',
            }}
          >
            {/* Top bar inside player */}
            <div style={{
              height: '44px',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 99999,
              transform: 'translateZ(10px)',
              willChange: 'transform',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: '8px'
            }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                {movie.title}
              </span>
            </div>

            {movie.imdb_id ? (
              <iframe
                key={activeServer}
                src={servers.find(s => s.id === activeServer)?.getUrl(movie.imdb_id)}
                style={{
                  width: '100%',
                  // In fullscreen the container fills the viewport; iframe must fill container
                  height: isFullscreen ? '100%' : '520px',
                  border: 'none',
                  display: 'block',
                  borderRadius: isFullscreen ? '0' : '12px'
                }}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                title={`Watch ${movie.title}`}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '520px',
                background: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <p className="text-text-muted text-lg">Video not available for this title.</p>
              </div>
            )}

            {/* Subtitle overlay — sibling of iframe, always mounted, using opacity transition */}
            <div
              className="subtitle-overlay"
              style={{
                position: 'absolute',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%) translateZ(10px)',
                zIndex: 99999,
                pointerEvents: 'none',
                width: 'fit-content',
                maxWidth: '80%',
                textAlign: 'center',
                opacity: currentSubtitle ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}
            >
              <span style={{
                display: 'inline-block',
                background: subtitleBackgroundColor,
                color: subtitleTextColor,
                fontSize: `${subtitleFontSize}px`,
                fontWeight: '500',
                lineHeight: '1.6',
                padding: '6px 20px',
                borderRadius: '4px',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                whiteSpace: 'pre-line'
              }}>
                {currentSubtitle || ''}
              </span>
            </div>

            {/* Floating subtitle control overlay on player */}
            {subtitleFileLoaded && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '16px',
                zIndex: 99999,
                transform: 'translateZ(10px)',
                willChange: 'transform',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                borderRadius: '50px',
                padding: '6px 14px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {/* Sub indicator dot */}
                <span style={{ fontSize: '9px', color: isSubPlaying ? '#22c55e' : '#666', marginRight: '2px' }}>⬤</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginRight: '4px' }}>SUB</span>

                {/* Timer */}
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: isSubPlaying ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', minWidth: '38px' }}>
                  {formatTime(elapsedTime)}
                </span>
              </div>
            )}

            {/* Custom fullscreen button — bottom-right corner.
                Using our container as the fullscreen element ensures the subtitle
                overlay (inside the container) stays visible in fullscreen. */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen (subtitles supported)'}
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                zIndex: 99999,
                transform: 'translateZ(10px)',
                willChange: 'transform',
                background: 'rgba(0,0,0,0.70)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                color: 'rgba(255,255,255,0.75)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(229,9,20,0.75)'
                e.currentTarget.style.borderColor = 'rgba(229,9,20,0.5)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.70)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
              }}
            >
              {isFullscreen ? (
                /* Exit fullscreen icon */
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
                </svg>
              ) : (
                /* Enter fullscreen icon */
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
          </div>
          {/* Fullscreen note */}
          <div style={{
            fontSize: '11px',
            color: '#333',
            textAlign: 'center',
            marginTop: '6px'
          }}>
            ⚠ Subtitles visible in windowed mode only — browser restricts overlay in fullscreen
          </div>
        </div>

        {/* ── Sinhala Subtitles Section ── */}
        <div className="w-full max-w-5xl px-4 pb-8">
          <div style={{
            background: '#0a0a0a',
            border: '1px solid #1e1e1e',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '12px'
          }}>
            {/* Top Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🇱🇰</span> Sinhala Subtitles
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {subtitleFileLoaded && (
                  <button
                    onClick={() => setIsSubtitleStyleOpen((prev) => !prev)}
                    style={{
                      background: isSubtitleStyleOpen ? '#e50914' : '#1a1a1a',
                      color: '#fff',
                      border: '1px solid ' + (isSubtitleStyleOpen ? '#e50914' : '#222'),
                      fontSize: '11px',
                      padding: '6px 12px',
                      borderRadius: '50px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubtitleStyleOpen) {
                        e.currentTarget.style.background = '#222';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubtitleStyleOpen) {
                        e.currentTarget.style.background = '#1a1a1a';
                      }
                    }}
                  >
                    Subtitle Style
                  </button>
                )}

                {!subtitleFileLoaded ? (
                  <span style={{
                    background: '#1a1a1a',
                    color: '#555',
                    fontSize: '11px',
                    padding: '4px 12px',
                    borderRadius: '50px',
                    fontWeight: 500
                  }}>
                    No subtitle loaded
                  </span>
                ) : (
                  <span style={{
                    background: 'rgba(34,197,94,0.1)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.2)',
                    fontSize: '11px',
                    padding: '4px 12px',
                    borderRadius: '50px',
                    fontWeight: 500
                  }}>
                    ● Loaded
                  </span>
                )}
              </div>
            </div>



            {/* Manual Upload Zone */}
            <div
              onMouseEnter={() => setIsUploadHovered(true)}
              onMouseLeave={() => setIsUploadHovered(false)}
              style={{
                border: '1.5px dashed ' + (
                  subtitleFileLoaded 
                    ? '#22c55e' 
                    : isUploadHovered 
                      ? '#e50914' 
                      : '#2a2a2a'
                ),
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                background: subtitleFileLoaded 
                  ? 'rgba(34,197,94,0.03)' 
                  : isUploadHovered 
                    ? 'rgba(229,9,20,0.03)' 
                    : 'transparent'
              }}
            >
              <input
                type="file"
                accept=".srt"
                onChange={handleSubtitleFile}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontSize: '24px',
                  color: subtitleFileLoaded ? '#22c55e' : '#444',
                  marginBottom: '4px'
                }}>
                  {subtitleFileLoaded ? '✓' : '⬆'}
                </span>
                {subtitleFileLoaded ? (
                  <>
                    <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subtitleFileName}
                    </span>
                    <span style={{ fontSize: '12px', color: '#444' }}>
                      Drop another .srt file or click to browse
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      Drop .srt file here
                    </span>
                    <span style={{ fontSize: '12px', color: '#444' }}>
                      or click to browse
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Offset controls — visible only when subtitle loaded */}
            {subtitleFileLoaded && (
              <div style={{
                marginTop: '16px',
                background: '#111',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                justifyContent: 'space-between'
              }}>
                {/* Current subtitle preview */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ fontSize: '11px', color: '#444', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Now playing</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', color: isSubPlaying ? '#22c55e' : '#555', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
                    {currentSubtitle || (isSubPlaying ? '...' : 'paused')}
                  </div>
                </div>

                {/* Manual Play/Pause & Reset controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setIsSubPlaying(prev => !prev)}
                    style={{
                      background: isSubPlaying ? '#e50914' : '#222',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isSubPlaying ? '#ff1a25' : '#333';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSubPlaying ? '#e50914' : '#222';
                    }}
                  >
                    {isSubPlaying ? '⏸ Pause Sub' : '▶ Play Sub'}
                  </button>
                  <button
                    onClick={resetSubtitle}
                    style={{
                      background: '#1a1a1a',
                      color: '#888',
                      border: '1px solid #222',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#222';
                      e.currentTarget.style.color = '#ccc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1a1a1a';
                      e.currentTarget.style.color = '#888';
                    }}
                  >
                    🔄 Reset
                  </button>
                </div>

                {/* Timer + Offset */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#555', minWidth: '42px' }}>{formatTime(elapsedTime)}</span>
                  <span style={{ fontSize: '12px', color: '#444' }}>Offset</span>
                  <button
                    onClick={() => setSubtitleOffset(prev => prev - 1)}
                    style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '6px', width: '28px', height: '28px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#aaa'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#888'; }}
                  >−</button>
                  <span style={{ fontSize: '13px', color: '#666', minWidth: '28px', textAlign: 'center' }}>{subtitleOffset}s</span>
                  <button
                    onClick={() => setSubtitleOffset(prev => prev + 1)}
                    style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '6px', width: '28px', height: '28px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#aaa'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#888'; }}
                  >+</button>
                </div>
              </div>
            )}

            {subtitleFileLoaded && isSubtitleStyleOpen && (
              <div style={{
                marginTop: '12px',
                background: '#111',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Subtitle Style
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#555' }}>
                      Adjust size, color, and background
                    </div>
                    <button
                      onClick={() => setIsSubtitleStyleOpen(false)}
                      style={{
                        background: '#1a1a1a',
                        color: '#bbb',
                        border: '1px solid #222',
                        borderRadius: '6px',
                        width: '30px',
                        height: '30px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Minimize subtitle style"
                    >
                      −
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#444', minWidth: '78px' }}>Letter Size</span>
                  <button
                    onClick={() => setSubtitleFontSize((prev) => Math.max(14, prev - 2))}
                    style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '6px', width: '30px', height: '30px', color: '#bbb', cursor: 'pointer' }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: '13px', color: '#ddd', minWidth: '48px', textAlign: 'center', fontFamily: 'monospace' }}>{subtitleFontSize}px</span>
                  <button
                    onClick={() => setSubtitleFontSize((prev) => Math.min(40, prev + 2))}
                    style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '6px', width: '30px', height: '30px', color: '#bbb', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#444', minWidth: '78px' }}>Letter Color</span>
                  {[
                    { label: 'White', value: '#ffffff' },
                    { label: 'Yellow', value: '#facc15' },
                    { label: 'Red', value: '#ef4444' },
                    { label: 'Cyan', value: '#22d3ee' },
                  ].map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSubtitleTextColor(color.value)}
                      title={color.label}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: subtitleTextColor === color.value ? '2px solid #fff' : '1px solid #2a2a2a',
                        background: color.value,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#444', minWidth: '78px' }}>Background</span>
                  {[
                    { label: 'Dark Red', value: 'rgba(229,9,20,0.75)' },
                    { label: 'Dark Gray', value: 'rgba(34,34,34,0.85)' },
                    { label: 'Transparent', value: 'rgba(0,0,0,0)' },
                    {label: 'black', value: 'rgba(0,0,0,0.9)'}
                  ].map((color) => (
                    <button
                      key={color.label}
                      onClick={() => setSubtitleBackgroundColor(color.value)}
                      title={color.label}
                      style={{
                        border: subtitleBackgroundColor === color.value ? '2px solid #fff' : '1px solid #2a2a2a',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        background: color.value,
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Source Links at bottom */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '12px', color: '#444' }}>Get subtitles from:</span>
              <a
                href="https://subz.lk"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#111',
                  border: '1px solid #1e1e1e',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: '#666',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.color = '#aaa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#1e1e1e';
                  e.currentTarget.style.color = '#666';
                }}
              >
                <span>↗</span> subz.lk
              </a>
              <a
                href="https://cineru.lk"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#111',
                  border: '1px solid #1e1e1e',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: '#666',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.color = '#aaa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#1e1e1e';
                  e.currentTarget.style.color = '#666';
                }}
              >
                <span>↗</span> cineru.lk
              </a>
              <a
                href="https://www.baiscope.lk/"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#111',
                  border: '1px solid #1e1e1e',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: '#666',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.color = '#aaa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#1e1e1e';
                  e.currentTarget.style.color = '#666';
                }}
              >
                <span>↗</span> baiscope.lk
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          3. CAST
          ═══════════════════════════════════════════ */}
      {cast.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pb-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="movie-section-heading mb-5">
            <div className="movie-section-heading-bar" />
            <h3 className="movie-section-heading-title">Cast</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {cast.map((person) => (
              <div key={person.id} className="movie-cast-card">
                {person.profile_path ? (
                  <img
                    src={`${IMG_BASE}${person.profile_path}`}
                    alt={person.name}
                    style={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '2 / 3',
                      background: '#151515',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UserIcon />
                  </div>
                )}
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#ddd', lineHeight: 1.3 }}>
                    {person.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', paddingTop: '2px', fontStyle: 'italic', lineHeight: 1.3 }}>
                    {person.character || 'Unknown role'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          4. YOU MIGHT ALSO LIKE (Inline Horizontal Scroll)
          ═══════════════════════════════════════════ */}
      <section className="w-full pb-20 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {/* Title and Buttons container (full width, aligned with scroll row) */}
        <div className="w-full px-4 md:px-8 lg:px-12 mb-8 flex items-center justify-between">
          <div className="movie-section-heading">
            <div className="movie-section-heading-bar" />
            <h2 className="movie-section-heading-title">You Might Also Like</h2>
          </div>
          {recs.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => scrollRecs('left')}
                aria-label="Scroll left"
                className="trending-arrow-btn"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#1a1a1a',
                  border: '1.5px solid #333',
                  color: '#ccc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => scrollRecs('right')}
                aria-label="Scroll right"
                className="trending-arrow-btn"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#1a1a1a',
                  border: '1.5px solid #333',
                  color: '#ccc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {recs.length > 0 ? (
          <div className="relative w-full">
            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

            <div
              ref={recsRef}
              className="overflow-x-auto scrollbar-hide flex gap-4 pb-4 px-4 md:px-8 lg:px-12"
              style={{ scrollBehavior: 'smooth' }}
            >
              {recs.map((rec) => (
                <div key={rec.id} className="flex-shrink-0 w-44">
                  <MovieCard movie={rec} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-text-muted text-center py-12">No recommendations available.</p>
          </div>
        )}
      </section>
      </div>
    </>
  )
}
