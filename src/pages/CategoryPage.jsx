import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPopularMovies, getTopRatedMovies, get2026Movies, getLanguageMovies } from '../api/tmdb';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';

const CATEGORY_CONFIG = {
  popular: {
    label: 'Most Popular Movies',
    fetcher: getPopularMovies,
  },
  'top-rated': {
    label: 'Top Rated Movies',
    fetcher: getTopRatedMovies,
  },
  '2026': {
    label: '2026 Movies',
    fetcher: get2026Movies,
  },
  english: {
    label: 'English Movies',
    fetcher: (page) => getLanguageMovies('en', page),
  },
  tamil: {
    label: 'Tamil Movies',
    fetcher: (page) => getLanguageMovies('ta', page),
  },
  hindi: {
    label: 'Hindi Movies',
    fetcher: (page) => getLanguageMovies('hi', page),
  },
  korean: {
    label: 'Korean Movies',
    fetcher: (page) => getLanguageMovies('ko', page),
  },
};

export default function CategoryPage() {
  const { type } = useParams();
  const config = CATEGORY_CONFIG[type];

  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchMovies = useCallback(async (pageNum) => {
    if (!config) return;
    try {
      const res = await config.fetcher(pageNum);
      const results = res.data.results;
      setTotalPages(res.data.total_pages);
      if (pageNum === 1) {
        setMovies(results);
      } else {
        setMovies((prev) => [...prev, ...results]);
      }
    } catch {
      setError('Failed to load movies. Please try again.');
    }
  }, [config]);

  useEffect(() => {
    setMovies([]);
    setPage(1);
    setError(null);
    setLoading(true);
    fetchMovies(1).finally(() => setLoading(false));
  }, [type]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    await fetchMovies(nextPage);
    setPage(nextPage);
    setLoadingMore(false);
  };

  if (!config) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ color: '#aaa', fontSize: '18px' }}>Category not found.</p>
        <Link to="/" style={{ color: '#e50914', textDecoration: 'none', fontWeight: 700 }}>← Back to Home</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f' }}>
      {/* Page Header */}
      <div style={{
        background: '#000000',
        padding: '48px 24px 36px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#888',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
              transition: 'color 0.2s',
            }}
            className="back-link"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '5px', height: '36px', background: '#e50914', borderRadius: '3px' }} />
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#fff',
                margin: 0,
                letterSpacing: '-0.5px',
              }}>
                {config.label}
              </h1>
              {!loading && (
                <p style={{ color: '#666', fontSize: '14px', marginTop: '6px' }}>
                  Showing {movies.length} movies
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: '32px 24px 60px' }}>
        {error ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#888' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px' }}>{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); fetchMovies(1).finally(() => setLoading(false)); }}
              style={{ background: '#e50914', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontWeight: 700 }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '20px',
            }}>
              {loading
                ? Array.from({ length: 20 }).map((_, i) => <MovieCardSkeleton key={i} />)
                : movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)
              }
            </div>

            {/* Load More */}
            {!loading && page < totalPages && (
              <div style={{ textAlign: 'center', marginTop: '48px' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    background: loadingMore ? '#333' : 'transparent',
                    color: loadingMore ? '#888' : '#e50914',
                    border: '2px solid',
                    borderColor: loadingMore ? '#333' : '#e50914',
                    borderRadius: '50px',
                    padding: '12px 40px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: loadingMore ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.5px',
                  }}
                  className="load-more-btn"
                >
                  {loadingMore ? 'Loading...' : 'Load More Movies'}
                </button>
              </div>
            )}

            {!loading && movies.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#888' }}>
                <p>No movies found.</p>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .back-link:hover { color: #fff !important; }
        .load-more-btn:hover:not(:disabled) {
          background: #e50914 !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
}
