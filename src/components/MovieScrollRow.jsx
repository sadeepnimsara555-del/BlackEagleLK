import { useRef } from 'react';
import { Link } from 'react-router-dom';

function ScrollCardSkeleton({ showNumbers }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', flexShrink: 0, width: showNumbers ? '280px' : '240px', position: 'relative' }}>
      {showNumbers && (
        <div style={{
          width: '100px',
          height: '140px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '8px',
          flexShrink: 0,
          zIndex: 3,
        }} />
      )}
      <div style={{
        width: '240px',
        height: '360px',
        borderRadius: '10px',
        background: 'linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.8s ease-in-out infinite',
        flexShrink: 0,
        marginLeft: showNumbers ? '-40px' : '0',
        zIndex: 2,
      }} />
    </div>
  );
}

export default function MovieScrollRow({ title, movies, loading, showNumbers = false, seeAllPath = null }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = direction === 'left' ? -540 : 540;
    container.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const skeletonCount = showNumbers ? 10 : 15;

  return (
    <section style={{
      width: '100%',
      background: 'linear-gradient(180deg, #141414 0%, #0f0f0f 100%)',
      padding: '40px 0',
      position: 'relative',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Section Header */}
      <div style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '4px', height: '28px', background: '#e50914', borderRadius: '2px' }} />
          <h2 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {title}
          </h2>
        </div>

        {/* Right side: See All + Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* See All button */}
          {seeAllPath && (
            <Link
              to={seeAllPath}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#e50914',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1.5px solid #e50914',
                borderRadius: '50px',
                padding: '6px 16px',
                transition: 'background 0.2s, color 0.2s',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
              }}
              className="see-all-btn"
            >
              See All
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          <button
            onClick={() => scroll('left')}
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
            onClick={() => scroll('right')}
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
      </div>

      {/* Scroll Row */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          overflowY: 'visible',
          scrollbarWidth: 'none',
          padding: '10px 24px 20px',
          gap: showNumbers ? '8px' : '16px',
          scrollBehavior: 'smooth',
        }}
        className="trending-scroll-row"
      >
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
            <ScrollCardSkeleton key={i} showNumbers={showNumbers} />
          ))
          : movies.map((movie, index) => {
            const rank = String(index + 1).padStart(2, '0');
            const poster = movie.poster_path
              ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
              : null;
            const rating = movie.vote_average != null ? movie.vote_average.toFixed(1) : 'N/A';
            const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';

            return (
              <Link
                key={movie.id}
                to={`/movie/${movie.id}`}
                style={{ textDecoration: 'none', flexShrink: 0 }}
                className="trending-card-link"
              >
                <div
                  className="trending-card"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  {/* Big rank number */}
                  {showNumbers && (
                    <span
                      style={{
                        fontSize: '140px',
                        fontWeight: 900,
                        lineHeight: 1,
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        letterSpacing: '-8px',
                        userSelect: 'none',
                        flexShrink: 0,
                        width: '100px',
                        textAlign: 'right',
                        zIndex: 3,
                        position: 'relative',
                        WebkitTextStroke: '2px #ffffff',
                      }}
                    >
                      {rank}
                    </span>
                  )}

                  {/* Poster */}
                  <div
                    style={{
                      position: 'relative',
                      width: '240px',
                      height: '360px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      marginLeft: showNumbers ? '-40px' : '0',
                      zIndex: 2,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    }}
                    className="trending-poster"
                  >
                    {poster ? (
                      <img
                        src={poster}
                        alt={movie.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" fill="none" stroke="#444" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div
                      className="trending-overlay"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '10px 8px',
                      }}
                    >
                      <p style={{
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        margin: 0,
                        lineHeight: 1.3,
                        textAlign: 'center',
                        wordBreak: 'break-word',
                      }}>
                        {movie.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '5px' }}>
                        <svg width="11" height="11" viewBox="0 0 20 20" fill="#facc15">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 0 0 .95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 0 0-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 0 0-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 0 0-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 0 0 .95-.69l1.286-3.957z" />
                        </svg>
                        <span style={{ color: '#e50914', fontSize: '11px', fontWeight: 800 }}>{rating}</span>
                        {year && <span style={{ color: '#aaa', fontSize: '10px', marginLeft: '2px' }}>· {year}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>

      <style>{`
        .trending-scroll-row::-webkit-scrollbar { display: none; }

        .trending-card:hover .trending-poster {
          transform: scale(1.05);
          box-shadow: 0 12px 40px rgba(0,0,0,0.8), 0 0 20px rgba(229,9,20,0.2) !important;
        }
        .trending-card:hover .trending-overlay {
          opacity: 1 !important;
        }

        .trending-arrow-btn:hover {
          background: #e50914 !important;
          border-color: #e50914 !important;
          color: #fff !important;
        }

        .see-all-btn:hover {
          background: #e50914 !important;
          color: #fff !important;
        }

        @media (max-width: 767px) {
          .trending-poster {
            width: 140px !important;
            height: 210px !important;
          }
        }
      `}</style>
    </section>
  );
}
