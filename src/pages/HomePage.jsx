import { useState, useEffect } from 'react';
import { getPopularMovies, getTopRatedMovies, getTrendingMovies, get2026Movies, getLanguageMovies, getGenreMovies } from '../api/tmdb';
import MovieScrollRow from '../components/MovieScrollRow';

export default function HomePage() {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [movies2026, setMovies2026] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [englishMovies, setEnglishMovies] = useState([]);
  const [tamilMovies, setTamilMovies] = useState([]);
  const [hindiMovies, setHindiMovies] = useState([]);
  const [koreanMovies, setKoreanMovies] = useState([]);
  const [cartoonMovies, setCartoonMovies] = useState([]);

  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loading2026, setLoading2026] = useState(true);
  const [loadingTopRated, setLoadingTopRated] = useState(true);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingEnglish, setLoadingEnglish] = useState(true);
  const [loadingTamil, setLoadingTamil] = useState(true);
  const [loadingHindi, setLoadingHindi] = useState(true);
  const [loadingKorean, setLoadingKorean] = useState(true);
  const [loadingCartoon, setLoadingCartoon] = useState(true);

  useEffect(() => {
    getTrendingMovies()
      .then((res) => setTrendingMovies(res.data.results.slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoadingTrending(false));

    get2026Movies()
      .then((res) => setMovies2026(res.data.results))
      .catch(() => {})
      .finally(() => setLoading2026(false));

    getTopRatedMovies()
      .then((res) => setTopRatedMovies(res.data.results))
      .catch(() => {})
      .finally(() => setLoadingTopRated(false));

    getPopularMovies()
      .then((res) => setPopularMovies(res.data.results))
      .catch(() => {})
      .finally(() => setLoadingPopular(false));

    getLanguageMovies('en')
      .then((res) => setEnglishMovies(res.data.results))
      .catch(() => {})
      .finally(() => setLoadingEnglish(false));

    getLanguageMovies('ta')
      .then((res) => setTamilMovies(res.data.results))
      .catch(() => {})
      .finally(() => setLoadingTamil(false));

    getLanguageMovies('hi')
      .then((res) => setHindiMovies(res.data.results))
      .catch(() => {})
      .finally(() => setLoadingHindi(false));

    getLanguageMovies('ko')
      .then((res) => setKoreanMovies(res.data.results))
      .catch(() => {})
      .finally(() => setLoadingKorean(false));

    getGenreMovies(16)
      .then((res) => setCartoonMovies(res.data.results))
      .catch(() => {})
      .finally(() => setLoadingCartoon(false));
  }, []);

  return (
    <div>
      {/* 1. Trending Top 10 — no See All */}
      <MovieScrollRow
        title="🔥 Trending Top 10 This Week"
        movies={trendingMovies}
        loading={loadingTrending}
        showNumbers={true}
      />

      {/* 2. 2026 Movies */}
      <MovieScrollRow
        title="2026 Movies"
        movies={movies2026}
        loading={loading2026}
        showNumbers={false}
        seeAllPath="/category/2026"
      />

      {/* 3. Top Rated Movies */}
      <MovieScrollRow
        title="Top Rated Movies"
        movies={topRatedMovies}
        loading={loadingTopRated}
        showNumbers={false}
        seeAllPath="/category/top-rated"
      />

      {/* 4. Most Popular Movies */}
      <MovieScrollRow
        title="Most Popular Movies"
        movies={popularMovies}
        loading={loadingPopular}
        showNumbers={false}
        seeAllPath="/category/popular"
      />

      {/* 6. English Movies */}
      <MovieScrollRow
        title="English Movies"
        movies={englishMovies}
        loading={loadingEnglish}
        showNumbers={false}
        seeAllPath="/category/english"
      />

      {/* 7. Tamil Movies */}
      <MovieScrollRow
        title="Tamil Movies"
        movies={tamilMovies}
        loading={loadingTamil}
        showNumbers={false}
        seeAllPath="/category/tamil"
      />

      {/* 8. Hindi Movies */}
      <MovieScrollRow
        title="Hindi Movies"
        movies={hindiMovies}
        loading={loadingHindi}
        showNumbers={false}
        seeAllPath="/category/hindi"
      />

      {/* 9. Korean Movies */}
      <MovieScrollRow
        title="Korean Movies"
        movies={koreanMovies}
        loading={loadingKorean}
        showNumbers={false}
        seeAllPath="/category/korean"
      />

      {/* 10. Cartoon Movies */}
      <MovieScrollRow
        title="Cartoon Movies"
        movies={cartoonMovies}
        loading={loadingCartoon}
        showNumbers={false}
        seeAllPath="/category/cartoon"
      />
    </div>
  );
}
