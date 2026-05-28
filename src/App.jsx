import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import MovieDetailPage from './pages/MovieDetailPage'
import CategoryPage from './pages/CategoryPage'
import NotFoundPage from './pages/NotFoundPage'
import SmartChatbot from './components/SmartChatbot'

function App() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
          <Route path="/category/:type" element={<CategoryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <SmartChatbot />
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <p className="text-text-muted text-sm">
            © {new Date().getFullYear()} BlackEagleLK. All rights reserved.
          </p>
          <p className="text-text-muted text-xs mt-2">
            Powered by TMDB API. This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
