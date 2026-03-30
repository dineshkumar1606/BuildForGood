import { useState, useRef, useEffect } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <button
        id="language-switcher-btn"
        onClick={() => setOpen(o => !o)}
        title="Change language"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.4rem 0.75rem',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border-light)',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
          transition: 'border-color 0.2s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
      >
        🌐 <span style={{ fontFamily: 'inherit' }}>{current.nativeName}</span>
        <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          minWidth: 170,
          overflow: 'hidden',
          zIndex: 999,
          animation: 'fadeIn 0.15s ease-out',
        }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              id={`lang-${l.code}`}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.7rem 1rem',
                border: 'none',
                background: lang === l.code ? 'rgba(37,99,235,0.1)' : 'transparent',
                color: lang === l.code ? 'var(--accent-primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                fontWeight: lang === l.code ? 700 : 500,
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (lang !== l.code) (e.currentTarget as HTMLElement).style.background = 'var(--bg-base)'; }}
              onMouseLeave={e => { if (lang !== l.code) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1rem' }}>{l.nativeName}</span>
              {lang === l.code && <span style={{ fontSize: '0.75rem' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
