import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import { useLang } from '../contexts/LanguageContext';

export default function Landing() {
  const { t } = useLang();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const heroRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Scroll reveal
  useEffect(() => {
    const targets = [heroRef.current, taglineRef.current, statsRef.current];
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); }),
      { threshold: 0.15 }
    );
    targets.forEach(t => { if (t) observer.observe(t); });
    return () => observer.disconnect();
  }, []);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="landing-layout">
      <Navbar />

      <main className="landing-main">
        {/* ── HERO ── */}
        <section className="hero-section reveal-section" ref={heroRef}>
          <div className="hero-content">
            <h1 className="hero-title">
              {t('practiceChange1')}<br />
              <span className="text-highlight">{t('practiceChange2')}</span>
            </h1>
            <p className="hero-subtitle">
              {t('heroSubtitle')}
            </p>
            <div className="hero-actions">
              <button className="btn-solid btn-lg" onClick={() => openAuth('signup')}>
                {t('startAsFounder')}
              </button>
              <button className="btn-ghost btn-lg" onClick={() => openAuth('signup')}>
                {t('joinAsCoFounder')} <ChevronDown size={18}/>
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card-stack">
              <div className="hero-card card-1">
                <div className="card-icon blue-dot">🌱</div>
                <div>
                  <div className="card-label">{t('asFounder')}</div>
                  <div className="card-sub">Discover, decide, and lead your venture</div>
                </div>
              </div>
              <div className="hero-card card-2">
                <div className="card-icon blue-dot">🤝</div>
                <div>
                  <div className="card-label">{t('asCoFounder')}</div>
                  <div className="card-sub">Join a live simulation, advise under pressure</div>
                </div>
              </div>
              <div className="hero-card card-3">
                <div className="card-icon purple-dot">📊</div>
                <div>
                  <div className="card-label">Impact Dashboard</div>
                  <div className="card-sub">Balance social outcomes vs. financial survival</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TAGLINE BANNER ── */}
        <section className="tagline-banner reveal-section" ref={taglineRef} id="about">
          <div className="tagline-inner">
            <h2 className="tagline-main">{t('practiceChange1')} {t('practiceChange2')}</h2>
            <p className="tagline-sub">
              {t('heroSubtitle')}
            </p>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="stats-section reveal-section" ref={statsRef}>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-desc">Founders Onboarded</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-desc">Countries Reached</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">98%</div>
              <div className="stat-desc">Satisfaction Rate</div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="features-section" id="contact">
          <h2 className="section-title">Everything you need to lead.</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Problem Discovery</h3>
              <p>Interview AI-generated community personas to validate your problem statement before wasting resources building the wrong solution.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚖️</div>
              <h3>Operational Decisions</h3>
              <p>Face real-world hurdles — permits, funding crises, community pushback — and make resource allocation decisions under pressure.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Impact vs. Sustainability</h3>
              <p>Track your social impact score against your cash runway in real time. Learn to balance mission with financial viability.</p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section">
          <h2>Ready to lead the change?</h2>
          <p>Join thousands of social entrepreneurs building tomorrow's solutions, today.</p>
          <button className="btn-cta-white" onClick={() => openAuth('signup')}>
            Start for Free
          </button>
        </section>
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
