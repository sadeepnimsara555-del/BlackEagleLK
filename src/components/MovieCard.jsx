import { Link } from 'react-router-dom';

const GENRE_MAP = {
  28: { name: 'Action', color: '#e50914' },
  12: { name: 'Adventure', color: '#f97316' },
  16: { name: 'Animation', color: '#a855f7' },
  35: { name: 'Comedy', color: '#eab308' },
  80: { name: 'Crime', color: '#6b7280' },
  99: { name: 'Documentary', color: '#22c55e' },
  18: { name: 'Drama', color: '#3b82f6' },
  10751: { name: 'Family', color: '#ec4899' },
  14: { name: 'Fantasy', color: '#8b5cf6' },
  36: { name: 'History', color: '#d97706' },
  27: { name: 'Horror', color: '#dc2626' },
  10402: { name: 'Music', color: '#06b6d4' },
  9648: { name: 'Mystery', color: '#7c3aed' },
  10749: { name: 'Romance', color: '#f43f5e' },
  878: { name: 'Sci-Fi', color: '#0ea5e9' },
  10770: { name: 'TV Movie', color: '#64748b' },
  53: { name: 'Thriller', color: '#b91c1c' },
  10752: { name: 'War', color: '#78716c' },
  37: { name: 'Western', color: '#ca8a04' },
};

export default function MovieCard({ movie }) {
  const { id, title, poster_path, release_date, vote_average, overview, genre_ids } = movie;
  const year = release_date ? new Date(release_date).getFullYear() : '—';
  const genres = (genre_ids || []).slice(0, 2).map((gid) => GENRE_MAP[gid]).filter(Boolean);
  const posterUrl = poster_path
    ? `https://image.tmdb.org/t/p/w500${poster_path}`
    : null;

  return (
    <Link to={`/movie/${id}`} className="block animate-fade-in-up">
      <div className="group bg-bg-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-bg-card-hover flex items-center justify-center">
              {/* Film icon placeholder */}
              <svg
                className="w-12 h-12 text-text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5c0 .621-.504 1.125-1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12H18M6 12v-1.5m0 1.5v1.5m0-1.5H4.875m0 3.75h1.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 15.75 6 15.246 6 14.625v-1.5m0 3.75v1.5c0 .621.504 1.125 1.125 1.125m-1.5 0h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m1.5 3.75c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125M18 7.125v-1.5m0 1.5v1.5m0-1.5h-1.5m0 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m0 3.75c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75h-1.5m0 3.75h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75v-1.5m0 1.5v1.5m0-1.5h1.125"
                />
              </svg>
            </div>
          )}

          {/* Hover overlay with overview */}
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
            <p className="p-4 text-sm text-text-primary line-clamp-4">
              {overview || 'No overview available.'}
            </p>
          </div>
        </div>

        {/* Info section */}
        <div className="p-3">
          <h3 className="font-semibold text-sm text-text-primary truncate mb-1.5">
            {title}
          </h3>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">{year}</span>

            <div className="flex items-center gap-1">
              {/* Star icon */}
              <svg
                className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 0 0 .95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 0 0-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 0 0-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 0 0-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 0 0 .95-.69l1.286-3.957z" />
              </svg>
              <span className="text-xs text-accent font-bold">
                {vote_average != null ? vote_average.toFixed(1) : 'N/A'}
              </span>
            </div>
          </div>

          {/* Genre Tags */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genres.map((g) => (
                <span
                  key={g.name}
                  style={{
                    backgroundColor: g.color + '22',
                    color: g.color,
                    border: `1px solid ${g.color}55`,
                  }}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none tracking-wide"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
