import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchMovies } from '../api/tmdb';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('query') || '';
  const [inputValue, setInputValue] = useState(query);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    if (!query) {
      setMovies([]);
      return;
    }

    setLoading(true);
    setError(null);

    searchMovies(query)
      .then((res) => setMovies(res.data.results))
      .catch(() => setError('Something went wrong. Please try again later.'))
      .finally(() => setLoading(false));
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      setSearchParams({ query: trimmed });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto mb-10">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search for movies..."
            className="w-full rounded-full bg-bg-card/80 backdrop-blur border border-border px-6 py-4 text-base text-text-primary placeholder:text-text-muted outline-none transition-all duration-300 focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            type="submit"
            className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors duration-300"
            aria-label="Search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </button>
        </div>
      </form>

      {/* Heading */}
      {query && (
        <div className="mb-6">
          <div className="w-12 h-1 bg-accent rounded-full mb-2" />
          <h2 className="text-2xl font-bold">
            Search Results{' '}
            {!loading && !error && (
              <span className="text-text-secondary text-base font-normal ml-2">
                ({movies.length} {movies.length === 1 ? 'result' : 'results'})
              </span>
            )}
          </h2>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-20 text-text-secondary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto mb-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg">{error}</p>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!loading && !error && movies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && !error && query && movies.length === 0 && (
        <div className="text-center py-20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20 mx-auto mb-6 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No results found for &ldquo;{query}&rdquo;
          </h3>
          <p className="text-text-secondary">Try different keywords</p>
        </div>
      )}

      {/* Initial State — no query */}
      {!query && (
        <div className="text-center py-20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20 mx-auto mb-6 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            Search for movies
          </h3>
          <p className="text-text-secondary">
            Type a movie name above to get started
          </p>
        </div>
      )}
    </div>
  );
}
