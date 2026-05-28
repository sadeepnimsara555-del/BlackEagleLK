import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/search?query=${encodeURIComponent(trimmed)}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: '100%', padding: '0 24px' }}>
        {/* Main bar */}
        <div style={{ display: 'flex', alignItems: 'center', height: '64px', gap: '24px' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontWeight: 800, fontSize: '22px', color: '#fff', letterSpacing: '-0.5px' }}>
              BlackEagleLK
            </span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e50914', marginBottom: '-6px' }} />
          </Link>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearch}
            style={{ display: 'none', flex: 1, maxWidth: '500px' }}
            className="navbar-search-desktop"
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              {/* Left icon */}
              <div style={{ position: 'absolute', left: '16px', color: '#666', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, shows..."
                style={{
                  width: '100%',
                  borderRadius: '50px',
                  background: '#1a1a1a',
                  border: '1.5px solid #333',
                  paddingLeft: '44px',
                  paddingRight: '110px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                }}
                className="navbar-search-input"
              />
              <button
                type="submit"
                style={{
                  position: 'absolute',
                  right: '5px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#e50914',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '7px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
                  letterSpacing: '0.3px',
                }}
                className="navbar-search-btn"
              >
                Search
              </button>
            </div>
          </form>

          {/* Hamburger — mobile */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((p) => !p)}
            className="navbar-hamburger"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'color 0.2s, background 0.2s',
              display: 'none',
            }}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile Search Dropdown */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: isMenuOpen ? '80px' : '0',
            paddingBottom: isMenuOpen ? '12px' : '0',
            opacity: isMenuOpen ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.3s ease, padding-bottom 0.3s ease',
          }}
        >
          <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '16px', color: '#666', pointerEvents: 'none', display: 'flex' }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, shows..."
              style={{
                width: '100%',
                borderRadius: '50px',
                background: '#1a1a1a',
                border: '1.5px solid #333',
                paddingLeft: '42px',
                paddingRight: '100px',
                paddingTop: '10px',
                paddingBottom: '10px',
                fontSize: '14px',
                color: '#fff',
                outline: 'none',
              }}
              className="navbar-search-input"
            />
            <button
              type="submit"
              style={{
                position: 'absolute',
                right: '5px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#e50914',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '7px 18px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Inline styles for responsive + hover */}
      <style>{`
        @media (min-width: 768px) {
          .navbar-search-desktop { display: flex !important; }
          .navbar-hamburger { display: none !important; }
        }
        @media (max-width: 767px) {
          .navbar-hamburger { display: flex !important; }
        }
        .navbar-search-input:focus {
          border-color: #e50914 !important;
          box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.18) !important;
        }
        .navbar-search-btn:hover {
          background: #ff1a25 !important;
          box-shadow: 0 0 14px rgba(229, 9, 20, 0.5) !important;
          transform: translateY(-50%) scale(1.04) !important;
        }
        .navbar-hamburger:hover {
          color: #fff !important;
          background: #1a1a1a !important;
        }
      `}</style>
    </nav>
  );
}
