import axios from 'axios'

const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

export const IMG_BASE = 'https://image.tmdb.org/t/p/w500'
export const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original'

const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
})

export const getPopularMovies = (page = 1) => tmdb.get('/movie/popular', { params: { page } })
export const getTopRatedMovies = (page = 1) => tmdb.get('/movie/top_rated', { params: { page } })
export const getTrendingMovies = () => tmdb.get('/trending/movie/week')
export const get2026Movies = (page = 1) => tmdb.get('/discover/movie', { params: { primary_release_year: 2026, sort_by: 'popularity.desc', page } })
export const getLanguageMovies = (language, page = 1) => tmdb.get('/discover/movie', { params: { with_original_language: language, sort_by: 'popularity.desc', page } })
export const searchMovies = (query) => tmdb.get('/search/movie', { params: { query } })
export const getMovieDetails = (id) => tmdb.get(`/movie/${id}`)
export const getMovieCredits = (id) => tmdb.get(`/movie/${id}/credits`)
export const getMovieRecommendations = (id) => tmdb.get(`/movie/${id}/recommendations`)

export default tmdb
