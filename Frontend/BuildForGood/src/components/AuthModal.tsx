import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

import img1 from '../assets/image.png';
import img2 from '../assets/image copy.png';
import img3 from '../assets/image copy 2.png';
import img4 from '../assets/image copy 3.png';

const slides = [
  { img: img1, headline: 'Practice the change.\nRisk-free.', sub: 'Simulate building your social enterprise safely.' },
  { img: img2, headline: 'Collaborate with\nstakeholders.', sub: 'Navigate complex ecosystems alongside real co-founders.' },
  { img: img3, headline: 'Balance impact\nwith sustainability.', sub: 'Learn to manage resources before the real stakes arrive.' },
  { img: img4, headline: 'Discover the root\nproblems.', sub: 'Perform deep qualitative surveys through intelligent chats.' }
];

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reset state when modal opens or mode changes externally
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep('email');
      setError('');
      setEmail('');
      setPassword('');
      setName('');
    }
  }, [isOpen, initialMode]);

  // Reset step when mode toggled internally
  useEffect(() => {
    setStep('email');
    setError('');
  }, [mode]);

  // Auto-advance slides
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 3500);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep('password');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const endpoint = mode === 'login' ? '/api/login' : '/api/signup';
    const payload = mode === 'login'
      ? { email, password }
      : { name, email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onClose();
        navigate('/dashboard');
      } else {
        setError(data.message || `${mode === 'login' ? 'Login' : 'Registration'} failed`);
      }
    } catch {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-split" onClick={e => e.stopPropagation()}>

        {/* ── LEFT BLUE PANEL ── */}
        <div className="modal-blue-panel">
          <div className="topo-overlay" aria-hidden="true">
            <svg className="topo-svg" viewBox="0 0 400 600" fill="none">
              <path d="M-50 100 Q 150 50 300 200 T 500 150" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none"/>
              <path d="M-50 170 Q 130 110 280 240 T 500 200" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none"/>
              <path d="M-50 240 Q 110 180 250 280 T 500 270" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none"/>
              <path d="M-50 310 Q 80 260 200 330 T 500 340" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" fill="none"/>
              <circle cx="110" cy="470" r="50"  stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none"/>
              <circle cx="110" cy="470" r="100" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none"/>
              <circle cx="110" cy="470" r="160" stroke="rgba(255,255,255,0.09)" strokeWidth="1.5" fill="none"/>
              <circle cx="110" cy="470" r="230" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>

          <div className="blue-slide-content" key={currentSlide}>
            <img src={slide.img} alt="" className="slide-image" />
            <div className="slide-headline">
              {slide.headline.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
            </div>
            <p className="slide-sub">{slide.sub}</p>
          </div>

          <div className="slide-dots">
            {slides.map((_, i) => (
              <button key={i} className={`slide-dot ${i === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(i)} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="modal-white-panel">
          <button className="modal-close" onClick={onClose}><X size={20}/></button>

          <div className="modal-form-area">
            <h2 className="modal-title">
              {mode === 'login' ? t('welcomeBack') : t('joinBuildForGood')}
            </h2>

            {error && (
              <div className="error-msg"><AlertCircle size={16}/> {error}</div>
            )}

            {/* Role selector removed — all users explore both roles freely */}

            {step === 'email' ? (
              <form onSubmit={handleEmailStep} className="modal-inner-form">
                {mode === 'signup' && (
                  <div className="flat-input-group">
                    <label className="flat-label">Full Name</label>
                    <input type="text" className="flat-input" placeholder="Jane Doe"
                      value={name} onChange={e => setName(e.target.value)} required autoFocus/>
                  </div>
                )}
                <div className="flat-input-group">
                  <label className="flat-label">{t('emailAddress')}</label>
                  <input type="email" className="flat-input" placeholder="jane@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus={mode === 'login'}/>
                </div>
                <button type="submit" className="btn-blue-full">Continue →</button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="modal-inner-form">
                <div className="email-recap">
                  <span>{email}</span>
                  <button type="button" className="change-email-btn" onClick={() => setStep('email')}>Edit</button>
                </div>
                <div className="flat-input-group">
                  <label className="flat-label">{t('password')}</label>
                  <input type="password" className="flat-input" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required autoFocus/>
                </div>
                <button type="submit" className="btn-blue-full" disabled={isLoading}>
                  {isLoading
                    ? <div className="loader-white"/>
                    : (mode === 'login' ? t('login') : t('signUp'))}
                </button>
              </form>
            )}

            <p className="tcpp">
              By proceeding I agree to <span className="blue-link">T&C</span> & <span className="blue-link">Privacy Policy</span>
            </p>

            <div className="modal-switch">
              {mode === 'login'
                ? <><span>{t('noAccount')}</span> <button type="button" className="text-btn-blue" onClick={() => setMode('signup')}>{t('signUp')}</button></>
                : <><span>{t('haveAccount')}</span> <button type="button" className="text-btn-blue" onClick={() => setMode('login')}>{t('login')}</button></>
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
