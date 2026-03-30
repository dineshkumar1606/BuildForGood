import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
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
  Clock
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLang } from '../contexts/LanguageContext';
import { FounderFlowContent } from './FounderFlow';
import { CoFounderBoardContent } from './CoFounderBoard';

type ActiveTab = 'overview' | 'founder' | 'cofounder' | 'reviews' | 'settings' | 'statements';

export default function Dashboard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    setProfileMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ name: profileName, email: profileEmail })
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
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsUpdatingProfile(false);
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/simulation`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Refresh list every time user navigates to the statements tab
  useEffect(() => {
    if (activeTab === 'statements') fetchProjects();
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('user');
    if (!token || !userDataStr) { navigate('/'); return; }
    try { 
       const u = JSON.parse(userDataStr);
       setUser(u); 
       setProfileName(u.name);
       setProfileEmail(u.email);
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
    { id: 'overview',    icon: LayoutDashboard, label: 'Overview' },
    { id: 'statements',  icon: FileText,        label: 'Your Statements' },
    { id: 'founder',     icon: TrendingUp,      label: 'As a Founder' },
    { id: 'cofounder',   icon: UserCheck,       label: 'As a Co-founder' },
    { id: 'reviews',     icon: Star,            label: 'Reviews' },
    { id: 'settings',    icon: Settings,        label: 'Settings' }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Logo - Always Visible on Top */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Hexagon size={26} style={{ color: 'var(--accent-primary)' }} strokeWidth={2.5} />
            <span style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              BuildForGood
            </span>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'1.25rem'}}>
          <LanguageSwitcher />
          <ThemeToggle />
          <button style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',display:'flex'}}>
            <Bell size={20} />
          </button>
          <div style={{
            width:34, height:34, borderRadius:'50%',
            background:'var(--accent-primary)', display:'flex',
            alignItems:'center', justifyContent:'center',
            fontWeight:600, fontSize:'.85rem', color:'#fff'
          }}>
            {initials}
          </div>
        </div>
      </header>

      {/* ── BELOW HEADER CONTENT & SIDEBAR ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── SIDEBAR ── */}
        <div 
          className="sidebar"
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
          style={{
            width: isSidebarOpen ? '260px' : '76px',
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
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== 'founder') setSelectedProjectId(null);
                }}
                style={{
                  justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                  padding: isSidebarOpen ? '0.75rem 1rem' : '0.85rem',
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  borderRadius: 'var(--radius-md)'
                }}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <div style={{ flexShrink: 0, display: 'flex' }}>
                  <item.icon size={20} />
                </div>
                <span style={{ 
                  whiteSpace: 'nowrap', opacity: isSidebarOpen ? 1 : 0, 
                  transition: 'opacity 0.2s', display: isSidebarOpen ? 'block' : 'none',
                  fontWeight: 500
                }}>
                  {item.label}
                </span>
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
                  {projects.map(p => (
                    <button
                      key={p._id}
                      onClick={() => {
                        setSelectedProjectId(p._id);
                        setActiveTab('founder');
                      }}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedProjectId === p._id ? 'rgba(37,99,235,0.1)' : 'transparent',
                        color: selectedProjectId === p._id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        width: '100%',
                        fontWeight: selectedProjectId === p._id ? 600 : 400
                      }}
                    >
                      {p.problemStatement.substring(0, 25)}...
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button 
              className="nav-link logout" 
              onClick={handleLogout}
              style={{
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                padding: isSidebarOpen ? '0.75rem 1rem' : '0.85rem',
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 'auto',
                borderRadius: 'var(--radius-md)'
              }}
              title={!isSidebarOpen ? "Log out" : undefined}
            >
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

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'1.25rem',marginBottom:'2rem'}}>
                <div className="stat-card">
                  <div className="stat-info"><h3 style={{fontSize:'0.9rem',color:'var(--text-secondary)',fontWeight:600}}>Simulations Started</h3><div style={{fontSize:'1.8rem',fontWeight:700,color:'var(--text-primary)',marginTop:'0.2rem'}}>{projects.length}</div></div>
                  <div style={{padding:'0.75rem',borderRadius:'12px',background:'rgba(37,99,235,0.1)',color:'var(--accent-primary)'}}><TrendingUp size={22}/></div>
                </div>
                <div className="stat-card">
                  <div className="stat-info"><h3 style={{fontSize:'0.9rem',color:'var(--text-secondary)',fontWeight:600}}>Rounds Completed</h3><div style={{fontSize:'1.8rem',fontWeight:700,color:'var(--text-primary)',marginTop:'0.2rem'}}>{projects.reduce((acc, p) => acc + (p.evaluation ? 1 : 0), 0)}</div></div>
                  <div style={{padding:'0.75rem',borderRadius:'12px',background:'rgba(16,185,129,0.1)',color:'var(--success)'}}><Activity size={22}/></div>
                </div>
                <div className="stat-card">
                  <div className="stat-info"><h3 style={{fontSize:'0.9rem',color:'var(--text-secondary)',fontWeight:600}}>Average Score</h3><div style={{fontSize:'1.8rem',fontWeight:700,color:'var(--text-primary)',marginTop:'0.2rem'}}>{projects.length > 0 ? (projects.reduce((acc, p) => acc + (p.evaluation?.score || 0), 0) / projects.length).toFixed(0) : 0}</div></div>
                  <div style={{padding:'0.75rem',borderRadius:'12px',background:'rgba(245,158,11,0.1)',color:'#f59e0b'}}><Star size={22}/></div>
                </div>
              </div>
              <div style={{background:'var(--bg-base)',border:'1px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'2rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:320,color:'var(--text-muted)',boxShadow:'var(--shadow-sm)'}}>
                <Activity size={44} style={{opacity:.25,marginBottom:'1rem'}}/>
                <span style={{fontSize:'1rem',fontWeight:500}}>Activity Timeline</span>
                <p style={{fontSize:'.88rem',marginTop:'.4rem'}}>Your venture milestones will appear here.</p>
              </div>
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
            const getStageColor = (p: any): string => {
              if (!p.evaluation) return 'var(--accent-primary)';
              return 'var(--success)';
            };
            return (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Your Statements</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.93rem' }}>All your saved problem statements with simulation progress. Click any to continue.</p>
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
                        { label: 'Discovery',  done: p.personas?.length > 0 },
                        { label: 'Evaluation', done: !!p.evaluation },
                        { label: 'Operations', done: false }, // tracked when stage 3 complete
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

                          {/* Stage indicators */}
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

                          {/* Progress bar */}
                          <div style={{ height: 6, background: 'var(--bg-surface-hover)', borderRadius: 3, overflow: 'hidden', marginBottom: '1.25rem' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, var(--accent-primary), var(--accent-hover))`, borderRadius: 3, transition: 'width 0.8s ease-out' }}/>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <button
                              onClick={() => { setSelectedProjectId(p._id); setActiveTab('founder'); }}
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

          {activeTab === 'founder' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out', flex: 1, display: 'flex', flexDirection: 'column' }}>
               <FounderFlowContent 
                 initialSimulationId={selectedProjectId} 
                 onProjectStarted={() => {
                   fetchProjects();
                   setSelectedProjectId(null); // Or keep it if you want to track active session
                 }}
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
              <p style={{color:'var(--text-secondary)',marginBottom:'2rem',lineHeight:1.65}}>Structured feedback from community peers and mentors to help you grow faster.</p>
              <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
                {[{name:'Ananya S.',stars:5,text:'Incredible simulation! The founder journey felt genuinely real and challenging.',time:'2 days ago'},{name:'Rahul M.',stars:4,text:'Great platform. The co-founder matching feature helped me find the right teammate.',time:'1 week ago'},{name:'Priya T.',stars:5,text:'The reviews system is gold. Honest feedback from real entrepreneurs.',time:'2 weeks ago'}].map((r,i)=>(
                  <div key={i} style={{background:'var(--bg-base)',border:'1px solid var(--border-light)',borderRadius:'var(--radius-md)',padding:'1.25rem 1.5rem',boxShadow:'var(--shadow-sm)'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.5rem'}}>
                      <span style={{fontWeight:600,color:'var(--text-primary)'}}>{r.name}</span>
                      <span style={{fontSize:'.8rem',color:'var(--text-muted)'}}>{r.time}</span>
                    </div>
                    <div style={{marginBottom:'.5rem',color:'#f59e0b',fontSize:'.95rem'}}>{'★'.repeat(r.stars)}{'☆'.repeat(5-r.stars)}</div>
                    <p style={{fontSize:'.93rem',color:'var(--text-secondary)',lineHeight:1.6}}>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div style={{maxWidth:560, animation: 'fadeIn 0.3s ease-in-out'}}>
              <h3 style={{fontSize:'1.4rem',fontWeight:700,marginBottom:'2rem',color:'var(--text-primary)'}}>⚙️ {t('settings')}</h3>
              <div style={{background:'var(--bg-base)',border:'1px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1.25rem',boxShadow:'var(--shadow-sm)'}}>
                {profileMessage.text && (
                  <div style={{ fontSize: '0.9rem', color: profileMessage.type === 'error' ? 'var(--error)' : 'var(--success)', padding: '0.5rem', background: profileMessage.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)' }}>
                    {profileMessage.text}
                  </div>
                )}
                <div>
                  <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>{t('fullName')}</label>
                  <input value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'1rem',background:'var(--bg-surface)',color:'var(--text-primary)'}} />
                </div>
                <div>
                  <label style={{display:'block',fontSize:'.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'.4rem'}}>{t('emailAddress')}</label>
                  <input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} style={{width:'100%',padding:'.75rem 1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',fontFamily:'inherit',fontSize:'1rem',background:'var(--bg-surface)',color:'var(--text-primary)'}} />
                </div>
                <button 
                  onClick={handleUpdateProfile} 
                  disabled={isUpdatingProfile || (!profileName.trim() || !profileEmail.trim())}
                  className="btn-solid" 
                  style={{ marginTop: '0.5rem', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isUpdatingProfile ? 'Updating...' : t('saveProfile')}
                </button>
                <div style={{height:'1px', background:'var(--border-light)', margin:'0.5rem 0'}}></div>
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
