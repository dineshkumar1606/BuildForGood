import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AuthModal from './AuthModal';
import LanguageSwitcher from './LanguageSwitcher';
import { useLang } from '../contexts/LanguageContext';

export default function Navbar() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [scrolled, setScrolled] = useState(false);
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <>
      <header className={`landing-header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="main-nav">
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="brand-logo-inline">
            <Hexagon size={26} strokeWidth={2.5} />
            <span style={{ color: 'var(--text-primary)' }}>BuildForGood</span>
          </Link>

          {/* Desktop Nav — only show content links when NOT logged in */}
          {!isLoggedIn && (
            <nav className="desktop-nav">
              <a href="#about" className="nav-item">{t('aboutUs')}</a>
              <a href="#contact" className="nav-item">{t('contactUs')}</a>
            </nav>
          )}

          {/* Desktop Nav — logged in state */}
          {isLoggedIn && (
            <nav className="desktop-nav">
              <Link to="/dashboard" className="nav-item">{t('dashboard')}</Link>
              <Link to="/founder" className="nav-item">{t('asFounder')}</Link>
              <Link to="/cofounder" className="nav-item">{t('asCoFounder')}</Link>
            </nav>
          )}

          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
            {isLoggedIn ? (
              <button className="btn-outline hide-mobile" onClick={handleLogout}>{t('logout')}</button>
            ) : (
              <>
                <button className="btn-outline hide-mobile" onClick={() => openAuth('login')}>{t('login')}</button>
                <button className="btn-solid hide-mobile" onClick={() => openAuth('signup')}>{t('getStarted')}</button>
              </>
            )}
            <button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="mobile-nav">
            {isLoggedIn ? (
              <>
                <Link to="/dashboard" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>{t('dashboard')}</Link>
                <Link to="/founder" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>{t('asFounder')}</Link>
                <Link to="/cofounder" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>{t('asCoFounder')}</Link>
                <div className="mobile-nav-actions">
                  <button className="btn-solid-full" onClick={handleLogout}>{t('logout')}</button>
                </div>
              </>
            ) : (
              <>
                <a href="#about" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>{t('aboutUs')}</a>
                <a href="#contact" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>{t('contactUs')}</a>
                <div className="mobile-nav-actions">
                  <button className="btn-outline-full" onClick={() => openAuth('login')}>{t('login')}</button>
                  <button className="btn-solid-full" onClick={() => openAuth('signup')}>{t('getStarted')}</button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
