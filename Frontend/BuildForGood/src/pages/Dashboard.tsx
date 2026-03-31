import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Bell, 
  LogOut,
  TrendingUp,
  Activity,
  Star,
  Hexagon,
  UserCheck,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  MessageCircle,
  ChevronDown,
  Globe,
  User
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLang } from '../contexts/LanguageContext';
import { FounderFlowContent } from './FounderFlow';
import { CoFounderBoardContent } from './CoFounderBoard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type ActiveTab = 'overview' | 'founder' | 'cofounder' | 'reviews' | 'settings' | 'statements';

// ── Types ──
interface Post {
  _id: string;
  userId: string;
  userName: string;
  problemStatement: string;
  caption: string;
  score: number | null;
  riskLabel: string;
  survived: boolean;
  finalCash: number;
  finalImpact: number;
  finalTrust: number;
  decisionCount: number;
  behavioralTags: string[];
  tacticalStance: string;
  comments: { _id: string; userId: string; userName: string; text: string; rating?: number | null; createdAt: string }[];
  createdAt: string;
}

// ── PostCard Component ──
function PostCard({ post, onCommentAdded }: { post: Post; onCommentAdded: (updated: Post) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initials = post.userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  const scoreColor = post.score != null ? (post.score >= 70 ? '#10b981' : post.score >= 40 ? '#f59e0b' : '#ef4444') : 'var(--text-muted)';

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/posts/${post._id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ text: commentText.trim(), rating: rating > 0 ? rating : null })
      });
      if (res.ok) {
        const updated: Post = await res.json();
        onCommentAdded(updated);
        setCommentText('');
        setRating(0);
      }
    } catch { /* ignore */ }
    finally { setIsSubmitting(false); }
  };

  return (
    <div style={{
      background: 'var(--bg-base)', border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s'
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'}
    >
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, color: '#fff', flexShrink: 0
          }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{post.userName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div style={{
            padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-pill)',
            background: post.survived ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: post.survived ? '#10b981' : '#ef4444',
            fontSize: '0.78rem', fontWeight: 700
          }}>
            {post.survived ? '🏆 Survived' : '📉 Failed'}
          </div>
        </div>

        {/* Problem Statement */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem', marginBottom: '1rem',
          borderLeft: '3px solid var(--accent-primary)'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>PROBLEM STATEMENT</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.55, margin: 0 }}>
            {post.problemStatement.length > 160 ? post.problemStatement.substring(0, 160) + '…' : post.problemStatement}
          </p>
        </div>

        {/* Caption */}
        {post.caption && (
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>{post.caption}</p>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
          {[
            { label: 'Discovery', value: post.score != null ? `${post.score}` : '—', color: scoreColor },
            { label: 'Cash', value: `${post.finalCash}%`, color: post.finalCash > 30 ? '#10b981' : '#ef4444' },
            { label: 'Impact', value: `${post.finalImpact}%`, color: '#60a5fa' },
            { label: 'Trust', value: `${post.finalTrust}%`, color: '#a78bfa' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Behavioral Tags */}
        {post.behavioralTags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            {post.behavioralTags.map((tag, i) => (
              <span key={i} style={{
                padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-pill)',
                background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
                fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600
              }}>• {tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Comments toggle */}
      <div style={{ borderTop: '1px solid var(--border-light)', padding: '0.75rem 1.5rem' }}>
        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, padding: 0
          }}
        >
          <MessageCircle size={16} />
          {post.comments.length > 0 ? `${post.comments.length} Comment${post.comments.length !== 1 ? 's' : ''}` : 'Add a comment / review'}
          <ChevronDown size={14} style={{ transform: showComments ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid var(--border-light)' }}>
          {post.comments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '1rem 0 0.75rem' }}>
              {post.comments.map(c => (
                <div key={c._id} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'var(--bg-surface-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0
                  }}>
                    {c.userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.userName}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {c.rating != null && c.rating > 0 && (
                      <div style={{ marginBottom: '0.25rem', color: '#f59e0b', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                        {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                      </div>
                    )}
                    <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <form onSubmit={handleComment} style={{ marginTop: post.comments.length > 0 ? '0' : '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.5rem' }}>Rating:</span>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button" key={star}
                  onClick={() => setRating(star === rating ? 0 : star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: (hoverRating || rating) >= star ? '#f59e0b' : 'var(--border-light)', fontSize: '1.2rem', transition: 'color 0.1s' }}
                >
                  ★
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Share your thoughts or review…"
                style={{
                  flex: 1, padding: '0.65rem 1rem', borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-light)', background: 'var(--bg-surface)',
                  color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.88rem'
                }}
              />
              <button
                type="submit" disabled={isSubmitting || !commentText.trim()}
                className="btn-solid"
                style={{ borderRadius: '50%', width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                {isSubmitting ? <div className="loader-white" style={{ width: 14, height: 14 }} /> : <Send size={15} />}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ──
export default function Dashboard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [user, setUser] = useState<{id: string; name: string; email: string; bio?: string; location?: string; title?: string; skills?: string[]; linkedinUrl?: string} | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileTitle, setProfileTitle] = useState('');
  const [profileSkills, setProfileSkills] = useState('');
  const [profileLinkedin, setProfileLinkedin] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Community Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // My Reviews state
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    setProfileMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          name: profileName, 
          email: profileEmail,
          bio: profileBio,
          location: profileLocation,
          title: profileTitle,
          skills: profileSkills.split(',').map(s => s.trim()).filter(Boolean),
          linkedinUrl: profileLinkedin
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setProfileMessage({ type: 'error', text: data.message || 'Failed to update profile' });
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsUpdatingProfile(false);
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/simulation`, {
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) setProjects(await res.json());
    } catch (err) { console.error('Failed to fetch projects', err); }
  };

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/posts`, {
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) setPosts(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingPosts(false); }
  };

  const fetchMyReviews = async () => {
    setLoadingReviews(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/posts/me/reviews`, {
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) setMyReviews(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingReviews(false); }
  };

  useEffect(() => { fetchProjects(); fetchPosts(); fetchMyReviews(); }, []);

  useEffect(() => {
    if (activeTab === 'statements') fetchProjects();
    if (activeTab === 'overview') fetchPosts();
    if (activeTab === 'reviews') fetchMyReviews();
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('user');
    if (!token || !userDataStr) { navigate('/'); return; }
    try {
      const u = JSON.parse(userDataStr);
      setUser(u);
      setProfileName(u.name || '');
      setProfileEmail(u.email || '');
      setProfileBio(u.bio || '');
      setProfileLocation(u.location || '');
      setProfileTitle(u.title || '');
      setProfileSkills(u.skills ? u.skills.join(', ') : '');
      setProfileLinkedin(u.linkedinUrl || '');
    } catch { navigate('/'); }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return (
    <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center'}}>
      <div className="loader-white" style={{borderColor:'var(--border-light)',borderLeftColor:'var(--accent-primary)'}}></div>
    </div>
  );

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const navItems: { id: ActiveTab, icon: any, label: string }[] = [
    { id: 'overview',   icon: Globe,     label: 'Community Feed' },
    { id: 'statements', icon: FileText,  label: 'Your Statements' },
    { id: 'founder',    icon: TrendingUp,label: 'As a Founder' },
    { id: 'cofounder',  icon: UserCheck, label: 'As a Co-founder' },
    { id: 'reviews',    icon: Star,      label: 'Reviews' },
    { id: 'settings',   icon: Settings,  label: 'Profile & Settings' },
  ];

  return (
    <div className="dashboard-layout" style={{ flexDirection: 'column' }}>

      {/* ── TOP APP HEADER ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.8rem 1.5rem', background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-light)', zIndex: 50,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <Hexagon size={26} style={{ color: 'var(--accent-primary)' }} strokeWidth={2.5} />
          <span style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>BuildForGood</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'1.25rem'}}>
          <LanguageSwitcher />
          <ThemeToggle />
          <button style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',display:'flex'}}>
            <Bell size={20} />
          </button>
          <div
            onClick={() => setActiveTab('settings')}
            style={{ width:34, height:34, borderRadius:'50%', background:'var(--accent-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:'.85rem', color:'#fff', cursor:'pointer' }}>
            {initials}
          </div>
        </div>
      </header>

      {/* ── BELOW HEADER ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── SIDEBAR ── */}
        <div
          className="sidebar"
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
          style={{
            width: isSidebarOpen ? '220px' : '76px',
            padding: isSidebarOpen ? '1.5rem 1.25rem' : '1.5rem 0.75rem',
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            alignItems: isSidebarOpen ? 'stretch' : 'center',
            overflow: 'hidden',
            borderRight: '1px solid var(--border-light)',
            background: 'var(--bg-base)',
            borderTop: 'none'
          }}
        >
          <div className="nav-menu" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, width: '100%' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(item.id); if (item.id !== 'founder') setSelectedProjectId(null); }}
                style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '0.75rem 1rem' : '0.85rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: 'var(--radius-md)' }}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <div style={{ flexShrink: 0, display: 'flex' }}><item.icon size={20} /></div>
                <span style={{ whiteSpace: 'nowrap', opacity: isSidebarOpen ? 1 : 0, transition: 'opacity 0.2s', display: isSidebarOpen ? 'block' : 'none', fontWeight: 500 }}>{item.label}</span>
              </button>
            ))}

            {!isSidebarOpen && projects.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '20px', height: '1px', background: 'var(--border-light)', marginBottom: '0.4rem' }}></div>
                <Activity size={20} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
              </div>
            )}

            {isSidebarOpen && projects.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '0 0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={14} /> Recent Projects
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {projects.slice(0, 4).map(p => (
                    <button key={p._id} onClick={() => { setSelectedProjectId(p._id); setActiveTab('founder'); }}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', border: 'none', background: selectedProjectId === p._id ? 'rgba(37,99,235,0.1)' : 'transparent', color: selectedProjectId === p._id ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%', fontWeight: selectedProjectId === p._id ? 600 : 400 }}>
                      {p.problemStatement.substring(0, 25)}...
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="nav-link logout" onClick={handleLogout}
              style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '0.75rem 1rem' : '0.85rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 'auto', borderRadius: 'var(--radius-md)' }}
              title={!isSidebarOpen ? "Log out" : undefined}>
              <div style={{ flexShrink: 0, display: 'flex' }}><LogOut size={20} /></div>
              <span style={{ whiteSpace: 'nowrap', opacity: isSidebarOpen ? 1 : 0, display: isSidebarOpen ? 'block' : 'none', fontWeight: 500 }}>Log out</span>
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="main-content" style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>

          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.55rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Welcome back, {user.name.split(' ')[0]} 👋
            </h2>
          </div>

          {/* ── OVERVIEW — COMMUNITY FEED ── */}
          {activeTab === 'overview' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: 780 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={20} style={{ color: 'var(--accent-primary)' }} /> Community Feed
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.93rem' }}>Simulation journeys shared by founders. Leave a comment or review.</p>
                </div>
                <button onClick={fetchPosts} style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.9rem', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  ↺ Refresh
                </button>
              </div>

              {loadingPosts ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                  <div className="loader-white" style={{ borderColor: 'var(--border-light)', borderLeftColor: 'var(--accent-primary)' }} />
                </div>
              ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-light)' }}>
                  <Globe size={40} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No posts yet. Complete a simulation and share your journey to be the first!</p>
                  <button onClick={() => setActiveTab('founder')} className="btn-solid" style={{ marginTop: '1.25rem' }}>
                    Start a Simulation
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {posts.map(post => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onCommentAdded={updated => setPosts(prev => prev.map(p => p._id === updated._id ? updated : p))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── YOUR STATEMENTS TAB ── */}
          {activeTab === 'statements' && (() => {
            const getProgress = (p: any): number => {
              if (!p.personas || p.personas.length === 0) return 10;
              const interviewed = (p.personas || []).filter((persona: any) =>
                (persona.history || []).filter((m: any) => m.role === 'user').length > 0
              ).length;
              const pct = interviewed / p.personas.length;
              if (!p.evaluation) return Math.round(20 + pct * 35);
              return 70;
            };
            const getStageLabel = (p: any): string => {
              if (!p.personas || p.personas.length === 0) return 'Not started';
              if (!p.evaluation) return 'Discovery in progress';
              return 'Evaluation complete';
            };
            const getStageColor = (p: any): string => !p.evaluation ? 'var(--accent-primary)' : 'var(--success)';
            return (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Your Statements</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.93rem' }}>All your saved problem statements with simulation progress.</p>
                  </div>
                  <button onClick={() => { setSelectedProjectId(null); setActiveTab('founder'); }} className="btn-solid"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    + New Simulation
                  </button>
                </div>
                {projects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-light)' }}>
                    <FileText size={40} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--text-muted)' }} />
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No simulations yet. Start as a Founder to define your first problem statement.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {projects.map((p: any) => {
                      const progress = getProgress(p);
                      const stageLabel = getStageLabel(p);
                      const stageColor = getStageColor(p);
                      const stages = [
                        { label: 'Discovery', done: p.personas?.length > 0 },
                        { label: 'Evaluation', done: !!p.evaluation },
                        { label: 'Operations', done: false },
                      ];
                      return (
                        <div key={p._id} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem 1.75rem', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.97rem', lineHeight: 1.55, flex: 1, margin: 0 }}>
                              {p.problemStatement.length > 180 ? p.problemStatement.substring(0, 180) + '...' : p.problemStatement}
                            </p>
                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700 }}>
                              <Clock size={13} /> Round {p.roundNumber}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            {stages.map((s, i) => (
                              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: s.done ? 'var(--success)' : 'var(--text-muted)' }}>
                                  {s.done ? <CheckCircle2 size={14}/> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--border-light)' }}/>}
                                  <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.label}</span>
                                </div>
                                {i < stages.length - 1 && <div style={{ width: 24, height: 1, background: 'var(--border-light)' }}/>}
                              </div>
                            ))}
                            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: stageColor, fontWeight: 700 }}>{stageLabel}</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--bg-surface-hover)', borderRadius: 3, overflow: 'hidden', marginBottom: '1.25rem' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, var(--accent-primary), var(--accent-hover))`, borderRadius: 3, transition: 'width 0.8s ease-out' }}/>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <button onClick={() => { setSelectedProjectId(p._id); setActiveTab('founder'); }}
                              className="btn-solid"
                              style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {p.evaluation ? 'Continue →' : 'Resume Discovery →'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── FOUNDER TAB ── */}
          {activeTab === 'founder' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <FounderFlowContent
                initialSimulationId={selectedProjectId}
                onProjectStarted={() => { fetchProjects(); setSelectedProjectId(null); }}
              />
            </div>
          )}

          {/* ── CO-FOUNDER TAB ── */}
          {activeTab === 'cofounder' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              <CoFounderBoardContent />
            </div>
          )}

          {/* ── REVIEWS TAB ── */}
          {activeTab === 'reviews' && (
            <div style={{maxWidth:680, animation: 'fadeIn 0.3s ease-in-out'}}>
              <h3 style={{fontSize:'1.4rem',fontWeight:700,marginBottom:'.5rem',color:'var(--text-primary)'}}>⭐ Reviews</h3>
              <p style={{color:'var(--text-secondary)',marginBottom:'2rem',lineHeight:1.65}}>Structured feedback from community peers and mentors on your simulations.</p>
              
              {loadingReviews ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                  <div className="loader-white" style={{ borderColor: 'var(--border-light)', borderLeftColor: 'var(--accent-primary)' }} />
                </div>
              ) : myReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-light)' }}>
                  <Star size={40} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>You haven't received any reviews yet. Share your simulations on the community feed to get feedback!</p>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
                  {myReviews.map((r) => (
                    <div key={r._id} style={{background:'var(--bg-base)',border:'1px solid var(--border-light)',borderRadius:'var(--radius-md)',padding:'1.25rem 1.5rem',boxShadow:'var(--shadow-sm)'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.5rem'}}>
                        <span style={{fontWeight:600,color:'var(--text-primary)'}}>{r.userName}</span>
                        <span style={{fontSize:'.8rem',color:'var(--text-muted)'}}>
                          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: 600, background: 'rgba(37,99,235,0.05)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                        On: {r.postProblem.length > 80 ? r.postProblem.substring(0, 80) + '...' : r.postProblem}
                      </div>
                      {r.rating != null && r.rating > 0 && (
                        <div style={{marginBottom:'.5rem',color:'#f59e0b',fontSize:'.95rem'}}>
                          {'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}
                        </div>
                      )}
                      <p style={{fontSize:'.93rem',color:'var(--text-secondary)',lineHeight:1.6,margin:0}}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE & SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: 680 }}>
              <h3 style={{fontSize:'1.4rem',fontWeight:700,marginBottom:'0.35rem',color:'var(--text-primary)', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                <User size={22} style={{ color:'var(--accent-primary)' }} /> Profile & Settings
              </h3>
              <p style={{ color:'var(--text-secondary)', fontSize:'0.92rem', marginBottom:'2rem' }}>Manage your account and personal preferences.</p>

              {/* My Activity Stats */}
              <div style={{marginBottom:'2rem'}}>
                <div style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.85rem'}}>My Activity</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1rem'}}>
                  <div className="stat-card">
                    <div className="stat-info"><h3 style={{fontSize:'0.9rem',color:'var(--text-secondary)',fontWeight:600}}>Simulations</h3><div style={{fontSize:'1.8rem',fontWeight:700,color:'var(--text-primary)',marginTop:'0.2rem'}}>{projects.length}</div></div>
                    <div style={{padding:'0.75rem',borderRadius:'12px',background:'rgba(37,99,235,0.1)',color:'var(--accent-primary)'}}><TrendingUp size={22}/></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info"><h3 style={{fontSize:'0.9rem',color:'var(--text-secondary)',fontWeight:600}}>Evaluations</h3><div style={{fontSize:'1.8rem',fontWeight:700,color:'var(--text-primary)',marginTop:'0.2rem'}}>{projects.reduce((acc, p) => acc + (p.evaluation ? 1 : 0), 0)}</div></div>
                    <div style={{padding:'0.75rem',borderRadius:'12px',background:'rgba(16,185,129,0.1)',color:'var(--success)'}}><Activity size={22}/></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info"><h3 style={{fontSize:'0.9rem',color:'var(--text-secondary)',fontWeight:600}}>Avg Score</h3><div style={{fontSize:'1.8rem',fontWeight:700,color:'var(--text-primary)',marginTop:'0.2rem'}}>{projects.length > 0 ? (projects.reduce((acc, p) => acc + (p.evaluation?.score || 0), 0) / projects.length).toFixed(0) : 0}</div></div>
                    <div style={{padding:'0.75rem',borderRadius:'12px',background:'rgba(245,158,11,0.1)',color:'#f59e0b'}}><Star size={22}/></div>
                  </div>
                </div>
              </div>

              {/* Profile Edit */}
              <div style={{background:'var(--bg-base)',border:'1px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1.25rem',boxShadow:'var(--shadow-sm)', marginBottom:'1.5rem'}}>
                <div style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.07em'}}>Edit Profile</div>
                {profileMessage.text && (
                  <div style={{ fontSize: '0.9rem', color: profileMessage.type === 'error' ? 'var(--error)' : 'var(--success)', padding: '0.5rem', background: profileMessage.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)' }}>
                    {profileMessage.text}
                  </div>
                )}
                
                <h4 style={{fontSize:'.9rem',fontWeight:700,color:'var(--text-primary)',marginBottom:'-0.5rem',marginTop:'0.5rem'}}>Personal Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>{t('fullName')}</label>
                    <input value={profileName} onChange={e => setProfileName(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'0.9rem',background:'var(--bg-surface)',color:'var(--text-primary)',boxSizing:'border-box'}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>{t('emailAddress')}</label>
                    <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'0.9rem',background:'var(--bg-surface)',color:'var(--text-primary)',boxSizing:'border-box'}} />
                  </div>
                </div>

                <div>
                  <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>Location</label>
                  <input placeholder="e.g. Bangalore, India" value={profileLocation} onChange={e => setProfileLocation(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'0.9rem',background:'var(--bg-surface)',color:'var(--text-primary)',boxSizing:'border-box'}} />
                </div>
                
                <div>
                  <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>Short Bio</label>
                  <textarea placeholder="Tell the community a bit about yourself..." value={profileBio} onChange={e => setProfileBio(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'0.9rem',background:'var(--bg-surface)',color:'var(--text-primary)',boxSizing:'border-box',minHeight:'80px',resize:'vertical'}} />
                </div>

                <h4 style={{fontSize:'.9rem',fontWeight:700,color:'var(--text-primary)',marginBottom:'-0.5rem',marginTop:'1rem'}}>Professional Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>Professional Title</label>
                    <input placeholder="e.g. Full-Stack Developer" value={profileTitle} onChange={e => setProfileTitle(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'0.9rem',background:'var(--bg-surface)',color:'var(--text-primary)',boxSizing:'border-box'}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>LinkedIn Profile URL</label>
                    <input placeholder="https://linkedin.com/in/yourprofile" value={profileLinkedin} onChange={e => setProfileLinkedin(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'0.9rem',background:'var(--bg-surface)',color:'var(--text-primary)',boxSizing:'border-box'}} />
                  </div>
                </div>

                <div>
                  <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>Skills (comma separated)</label>
                  <input placeholder="e.g. React, Node.js, Marketing, Product Management" value={profileSkills} onChange={e => setProfileSkills(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'0.9rem',background:'var(--bg-surface)',color:'var(--text-primary)',boxSizing:'border-box'}} />
                </div>

                <button onClick={handleUpdateProfile} disabled={isUpdatingProfile || (!profileName.trim() || !profileEmail.trim())}
                  className="btn-solid" style={{ marginTop: '0.5rem', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isUpdatingProfile ? 'Updating...' : t('saveProfile')}
                </button>
              </div>

              {/* Preferences */}
              <div style={{background:'var(--bg-base)',border:'1px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'1.5rem',boxShadow:'var(--shadow-sm)'}}>
                <div style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'1.25rem'}}>Preferences</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontWeight:500,color:'var(--text-primary)'}}>{t('darkMode')}</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
