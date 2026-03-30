import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { ArrowRight, TrendingUp, DollarSign, Users, Lock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface SimulationSummary {
  _id: string;
  problemStatement: string;
  roundNumber: number;
  evaluation: { score: number; riskLabel: string } | null;
  createdAt: string;
}

const DOMAIN_TAGS = ['All', 'Climate', 'Health', 'Education', 'Fintech', 'Agriculture'];

// Domain detector from problem statement
function detectDomain(problem: string): string {
  const p = problem.toLowerCase();
  if (p.includes('health') || p.includes('clinic') || p.includes('medical') || p.includes('mental')) return 'Health';
  if (p.includes('climate') || p.includes('carbon') || p.includes('solar') || p.includes('waste') || p.includes('compost')) return 'Climate';
  if (p.includes('education') || p.includes('school') || p.includes('learn') || p.includes('student')) return 'Education';
  if (p.includes('farm') || p.includes('agri') || p.includes('crop') || p.includes('soil')) return 'Agriculture';
  if (p.includes('finance') || p.includes('loan') || p.includes('credit') || p.includes('bank')) return 'Fintech';
  return 'Social';
}

export function CoFounderBoardContent() {
  const [filter, setFilter] = useState('All');
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSim, setSelectedSim] = useState<SimulationSummary | null>(null);
  const [advice, setAdvice] = useState('');
  const [adviceSent, setAdviceSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    setIsLoading(true);
    try {
      // Fetch all simulations that have been evaluated (Stage 2 ready)
      const res = await fetch(`${API_URL}/api/simulation/public`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSimulations(data);
      } else {
        // Fallback: show simulations from our own account for demo
        const res2 = await fetch(`${API_URL}/api/simulation`, { headers: getHeaders() });
        if (res2.ok) {
          const data = await res2.json();
          setSimulations(data.filter((s: SimulationSummary) => s.evaluation));
        }
      }
    } catch {
      setSimulations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAdvice = async () => {
    if (!advice.trim() || !selectedSim) return;
    setIsSending(true);
    try {
      // POST advice to the simulation as a co-founder note
      await fetch(`${API_URL}/api/simulation/${selectedSim._id}/cofounder`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ advice })
      });
    } catch { /* optimistic — mark as sent regardless */ }
    finally {
      setAdviceSent(true);
      setIsSending(false);
    }
  };

  const filteredSims = simulations.filter(s => {
    if (filter === 'All') return true;
    return detectDomain(s.problemStatement) === filter;
  });

  // ── DETAIL VIEW ──
  if (selectedSim) {
    const domain = detectDomain(selectedSim.problemStatement);
    const evalScore = selectedSim.evaluation?.score ?? 0;
    const riskColor = evalScore >= 70 ? '#10b981' : evalScore >= 40 ? '#f59e0b' : '#ef4444';

    return (
      <div style={{ maxWidth:760, margin:'0 auto', width:'100%', animation:'fadeIn 0.3s ease-out' }}>
        <button onClick={() => { setSelectedSim(null); setAdvice(''); setAdviceSent(false); }}
          style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'none', border:'none', color:'var(--text-secondary)', fontWeight:600, cursor:'pointer', marginBottom:'1.5rem', fontSize:'0.95rem' }}>
          ← Back to Board
        </button>

        {/* Venture header */}
        <div style={{ background:'var(--bg-base)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-lg)', padding:'2rem', marginBottom:'1.5rem', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
            <div>
              <span className="eyebrow-tag" style={{ marginBottom:'0.6rem', display:'inline-block' }}>{domain}</span>
              <h2 style={{ fontSize:'1.4rem', fontWeight:700, color:'var(--text-primary)', lineHeight:1.4 }}>
                {selectedSim.problemStatement.length > 120
                  ? selectedSim.problemStatement.substring(0, 120) + '...'
                  : selectedSim.problemStatement}
              </h2>
            </div>
          </div>

          {/* Discovery Score */}
          {selectedSim.evaluation && (
            <div style={{ marginTop:'1.5rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                <span style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-secondary)' }}>Founder Discovery Score</span>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <span style={{ fontWeight:800, fontSize:'1.2rem', color: riskColor }}>{evalScore}</span>
                  <span style={{ fontSize:'0.78rem', background:'var(--bg-surface-hover)', padding:'0.2rem 0.5rem', borderRadius:'var(--radius-pill)', fontWeight:600, color:'var(--text-secondary)' }}>
                    {selectedSim.evaluation.riskLabel}
                  </span>
                </div>
              </div>
              <div style={{ height:8, background:'var(--bg-surface-hover)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${evalScore}%`, height:'100%', background: riskColor, transition:'width 0.8s ease-out' }}/>
              </div>
            </div>
          )}
        </div>

        {/* What does a co-founder do here */}
        <div style={{ background:'rgba(37,99,235,0.04)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:'var(--radius-md)', padding:'1.25rem 1.5rem', marginBottom:'1.5rem' }}>
          <div style={{ fontWeight:700, color:'var(--accent-primary)', marginBottom:'0.4rem', fontSize:'0.9rem' }}>🤝 Your Role as Co-founder</div>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.93rem', lineHeight:1.6, margin:0 }}>
            This founder is about to enter their <strong>Operational Decision Phase</strong>. They will face 3 real-world hurdles with limited resources.
            As a co-founder, give them <strong>one piece of strategic advice</strong> for navigating this situation. Your perspective will appear as a co-founder insight during their simulation.
          </p>
        </div>

        {/* Advice input */}
        {!adviceSent ? (
          <div style={{ background:'var(--bg-base)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-lg)', padding:'1.75rem', boxShadow:'var(--shadow-sm)' }}>
            <label style={{ display:'block', fontWeight:600, color:'var(--text-primary)', marginBottom:'0.75rem' }}>
              Your Strategic Advice
            </label>
            <textarea
              style={{ width:'100%', height:120, padding:'1rem', borderRadius:'var(--radius-md)', border:'1px solid var(--border-light)', background:'var(--bg-surface)', fontFamily:'inherit', fontSize:'0.97rem', color:'var(--text-primary)', resize:'vertical', lineHeight:1.6 }}
              placeholder={`E.g. "Before spending on marketing, secure all government permits. I've seen ventures waste months on visibility while missing the legal foundation."`}
              value={advice}
              onChange={e => setAdvice(e.target.value)}
            />
            <button
              onClick={handleSendAdvice}
              disabled={!advice.trim() || isSending}
              className="btn-solid btn-lg"
              style={{ width:'100%', marginTop:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
              {isSending ? <div className="loader-white"/> : '📨 Send Co-founder Advice'}
            </button>
          </div>
        ) : (
          <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'var(--radius-lg)', padding:'2rem', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>✅</div>
            <h3 style={{ color:'var(--text-primary)', fontWeight:700, marginBottom:'0.4rem' }}>Advice Sent!</h3>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.95rem', lineHeight:1.6 }}>
              The founder will see your perspective as a co-founder insight during their operational simulation.
              Your collaboration is a real part of their journey.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── BOARD VIEW ──
  return (
    <div style={{ maxWidth:1200, margin:'0 auto', width:'100%', flex:1 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'2.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <div className="eyebrow-tag" style={{ marginBottom:'0.75rem' }}>CO-FOUNDER DISCOVERY</div>
          <h1 className="hero-title" style={{ fontSize:'clamp(1.8rem,4vw,2.5rem)', marginBottom:'0.4rem' }}>Join a venture. Shape its future.</h1>
          <p className="hero-subtitle" style={{ margin:0, fontSize:'1rem' }}>
            Real founders, real problem statements. Send strategic advice before they face operational decisions.
          </p>
        </div>

        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {DOMAIN_TAGS.map(d => (
            <button key={d} onClick={() => setFilter(d)}
              style={{ padding:'0.45rem 1.1rem', borderRadius:'var(--radius-pill)', border:'1.5px solid var(--border-light)', background: filter===d ? 'var(--text-primary)' : 'var(--bg-base)', color: filter===d ? 'var(--bg-base)' : 'var(--text-primary)', fontWeight:600, fontSize:'0.88rem', fontFamily:'inherit', cursor:'pointer', transition:'all 0.2s', whiteSpace:'nowrap' }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* What is this? */}
      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', padding:'1.25rem 1.5rem', marginBottom:'2rem', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.5rem' }}>
        {[
          { icon:<DollarSign size={18}/>, label:'Resource at Stake', desc:'Founders manage cash, impact, and trust in real-time decisions' },
          { icon:<TrendingUp size={18}/>, label:'Your Advice Matters', desc:'Co-founder insights appear in their simulation as strategic perspective' },
          { icon:<Users size={18}/>, label:'Build Together', desc:'The best ventures succeed because of collaboration under pressure' },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', gap:'0.75rem', alignItems:'flex-start' }}>
            <div style={{ color:'var(--accent-primary)', flexShrink:0, marginTop:'0.1rem' }}>{item.icon}</div>
            <div>
              <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.88rem', marginBottom:'0.2rem' }}>{item.label}</div>
              <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.5 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Simulations grid */}
      {isLoading ? (
        <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>
          <div className="loader-white" style={{ margin:'0 auto 1rem', borderColor:'var(--border-light)', borderLeftColor:'var(--accent-primary)', width:32, height:32 }}/>
          Loading active ventures...
        </div>
      ) : filteredSims.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem 2rem', color:'var(--text-muted)', background:'var(--bg-base)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-light)' }}>
          <Lock size={36} style={{ opacity:0.3, marginBottom:'1rem' }}/>
          <h3 style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:'0.5rem' }}>No ventures available yet</h3>
          <p style={{ fontSize:'0.93rem' }}>Founders who complete the Discovery phase will appear here. Be the first to start as a Founder!</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'1.5rem' }}>
          {filteredSims.map(sim => {
            const domain = detectDomain(sim.problemStatement);
            const evalScore = sim.evaluation?.score ?? null;
            const riskColor = evalScore === null ? 'var(--text-muted)' : evalScore >= 70 ? '#10b981' : evalScore >= 40 ? '#f59e0b' : '#ef4444';

            return (
              <div key={sim._id} className="feature-card" style={{ display:'flex', flexDirection:'column', cursor:'pointer' }}
                onClick={() => setSelectedSim(sim)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                  <span className="eyebrow-tag" style={{ background:'var(--bg-surface)', border:'1px solid var(--border-light)', color:'var(--text-secondary)', fontSize:'0.72rem' }}>{domain}</span>
                  {evalScore !== null && (
                    <span style={{ fontSize:'0.78rem', fontWeight:700, color: riskColor }}>
                      Score: {evalScore}
                    </span>
                  )}
                </div>

                <p style={{ color:'var(--text-primary)', fontWeight:500, fontSize:'0.95rem', lineHeight:1.6, flex:1, marginBottom:'1.5rem' }}>
                  {sim.problemStatement.length > 140
                    ? sim.problemStatement.substring(0, 140) + '...'
                    : sim.problemStatement}
                </p>

                {evalScore !== null && (
                  <div style={{ marginBottom:'1.25rem' }}>
                    <div style={{ height:4, background:'var(--bg-surface-hover)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${evalScore}%`, height:'100%', background: riskColor }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>
                      <span>Discovery Score</span>
                      <span>{sim.evaluation?.riskLabel}</span>
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'1.25rem', borderTop:'1px solid var(--border-light)', marginTop:'auto' }}>
                  <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
                    Round {sim.roundNumber} · {new Date(sim.createdAt).toLocaleDateString()}
                  </span>
                  <button className="btn-ghost" style={{ fontSize:'0.88rem', color:'var(--accent-primary)', padding:0, display:'flex', alignItems:'center', gap:'0.35rem' }}>
                    Advise <ArrowRight size={16}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CoFounderBoard() {
  return (
    <div className="landing-layout">
      <Navbar/>
      <main className="landing-main" style={{ padding:'2rem 2.5rem', display:'flex', flex:1 }}>
        <CoFounderBoardContent/>
      </main>
    </div>
  );
}
