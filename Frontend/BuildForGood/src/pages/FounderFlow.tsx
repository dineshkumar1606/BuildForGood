import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import {
  Sparkles, UserCircle, Send, ArrowLeft, BrainCircuit,
  RefreshCw, CheckCircle2, Activity, ShieldAlert,
  AlertTriangle, Zap
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── TYPES ──
interface Message { role: 'user' | 'model'; content: string; }
interface Persona { _id: string; name: string; age: number; occupation: string; bio: string; history: Message[]; }
interface Evaluation { score: number; riskLabel: string; winRate: string; discipline: string; behavioralTags: string[]; tacticalStance: string; }

// ── OPERATIONAL SCENARIOS — Rule-based, no LLM needed ──
// These are generated once based on domain from evaluation. 
// LLM generates them in Stage 2 (POST /simulation/scenarios).
interface Choice { id: string; label: string; deltas: { cash: number; impact: number; trust: number }; }
interface Scenario { id: string; title: string; description: string; choices: Choice[]; }

type AppState = 'form' | 'personas' | 'chat' | 'evaluation' | 'operational' | 'report';

interface FounderFlowProps {
  initialSimulationId?: string | null;
  onProjectStarted?: () => void;
}

export function FounderFlowContent({ initialSimulationId, onProjectStarted }: FounderFlowProps) {
  const { t } = useLang();
  // ── STAGE TRACKING ──
  const [appState, setAppState] = useState<AppState>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── STAGE 1 STATE ──
  const [problem, setProblem] = useState('');
  const [budget, setBudget] = useState<number | ''>('');
  const [round, setRound] = useState(1);
  const [simulationId, setSimulationId] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── STAGE 2 STATE (Operational Decisions) ──
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [resources, setResources] = useState({ cash: 80, impact: 20, trust: 50 });
  const [remainingBudget, setRemainingBudget] = useState<number | null>(null);
  const [decisionLog, setDecisionLog] = useState<{ scenarioId: string; choiceLabel: string; deltas: { cash: number; impact: number; trust: number } }[]>([]);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'ngrok-skip-browser-warning': 'true'
  });

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  // Load existing project
  useEffect(() => {
    if (initialSimulationId) loadExistingProject(initialSimulationId);
  }, [initialSimulationId]);

  const loadExistingProject = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/simulation/${id}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSimulationId(data._id);
        setProblem(data.problemStatement);
        setRound(data.roundNumber);
        setPersonas(data.personas || []);
        if (data.budget) setBudget(data.budget);
        if (data.remainingBudget != null) setRemainingBudget(data.remainingBudget);
        if (data.evaluation) {
          setEvaluation(data.evaluation);
          // Restore operational state if it was in progress
          if (data.operationalComplete) {
            if (data.operationalResources) setResources(data.operationalResources);
            if (data.decisionLog) setDecisionLog(data.decisionLog);
            setAppState('report');
          } else if (data.decisionLog?.length > 0) {
            // Operational was started but not finished — restore gauges, let user continue
            if (data.operationalResources) setResources(data.operationalResources);
            if (data.decisionLog) setDecisionLog(data.decisionLog);
            setAppState('evaluation'); // Let user re-enter operational from evaluation
          } else {
            setAppState('evaluation');
          }
        } else if (data.personas?.length > 0) {
          setAppState('personas');
        }
      }
    } catch { setError('Failed to load project'); }
    finally { setIsLoading(false); }
  };

  // ── STAGE 1: Start simulation → LLM generates personas ──
  const handleStartSimulation = async () => {
    if (!problem.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/simulation/start`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ problemStatement: problem, roundNumber: round, simulationId: simulationId || undefined, budget: budget || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start');
      setSimulationId(data._id);
      setPersonas(data.personas);
      if (data.budget) setBudget(data.budget);
      setAppState('personas');
      onProjectStarted?.();
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  // ── STAGE 1: Save Draft — refs keep latest values without stale closures ──
  const problemRef = useRef('');
  const simulationIdRef = useRef('');
  const appStateRef = useRef<AppState>('form');

  useEffect(() => { problemRef.current = problem; }, [problem]);
  useEffect(() => { simulationIdRef.current = simulationId; }, [simulationId]);
  useEffect(() => { appStateRef.current = appState; }, [appState]);

  const handleSaveDraft = async (p = problemRef.current, sid = simulationIdRef.current) => {
    if (!p.trim() || appStateRef.current !== 'form') return;
    try {
      const res = await fetch(`${API_URL}/api/simulation/draft`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ problemStatement: p, simulationId: sid || undefined, budget: typeof budget === 'number' ? budget : undefined })
      });
      if (res.ok) {
        const data = await res.json();
        if (!sid) setSimulationId(data._id);
        onProjectStarted?.();
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  // Save on unmount — fires reliably when user switches tabs
  useEffect(() => {
    return () => {
      const p = problemRef.current;
      const sid = simulationIdRef.current;
      if (!p.trim() || appStateRef.current !== 'form') return;
      fetch(`${API_URL}/api/simulation/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ problemStatement: p, simulationId: sid || undefined })
      }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── STAGE 1: Open persona chat ──
  const openChat = (persona: Persona) => {
    setSelectedPersona(persona);
    // Filter out the system greeting from chat display
    const displayHistory = persona.history.filter(m => !m.content.startsWith('*You see'));
    setChatHistory(displayHistory);
    setAppState('chat');
  };

  // ── STAGE 1: Send message to persona → LLM responds in character ──
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading || !selectedPersona) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/simulation/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ simulationId, personaId: selectedPersona._id, message: userMsg })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const displayHistory = data.history.filter((m: Message) => !m.content.startsWith('*You see'));
      setChatHistory(displayHistory);
      setPersonas(prev => prev.map(p => p._id === selectedPersona._id ? { ...p, history: data.history } : p));
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  // ── STAGE 1: Evaluate → LLM grades performance ──
  const handleEvaluate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/simulation/evaluate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ simulationId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEvaluation(data.evaluation);
      setAppState('evaluation');
      onProjectStarted?.();
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  // ── STAGE 2: Generate operational scenarios (Rule-based + problem domain)  ──
  // LLM POINT: POST /simulation/scenarios generates domain-specific scenarios
  const handleEnterOperational = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/simulation/scenarios`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ simulationId, problemStatement: problem })
      });
      if (res.ok) {
        const data = await res.json();
        setScenarios(data.scenarios);
      } else {
        setScenarios(getFallbackScenarios(problem));
      }
      setCurrentScenarioIdx(0);
      setResources({ cash: 80, impact: 20, trust: 50 });
      setRemainingBudget(typeof budget === 'number' ? budget : null);
      setDecisionLog([]);
      setAppState('operational');
    } catch {
      setScenarios(getFallbackScenarios(problem));
      setCurrentScenarioIdx(0);
      setResources({ cash: 80, impact: 20, trust: 50 });
      setRemainingBudget(typeof budget === 'number' ? budget : null);
      setDecisionLog([]);
      setAppState('operational');
    } finally { setIsLoading(false); }
  };

  // ── STAGE 2: Make a decision → Rule-based variable update ──
  const handleDecision = async (choice: Choice) => {
    const newResources = {
      cash:   Math.max(0, Math.min(100, resources.cash   + choice.deltas.cash)),
      impact: Math.max(0, Math.min(100, resources.impact + choice.deltas.impact)),
      trust:  Math.max(0, Math.min(100, resources.trust  + choice.deltas.trust)),
    };
    setResources(newResources);
    const newLog = [...decisionLog, {
      scenarioId: scenarios[currentScenarioIdx].id,
      choiceLabel: choice.label,
      deltas: choice.deltas
    }];
    setDecisionLog(newLog);

    // Budget reduction: each 1% cash drop = proportional ₹ reduction
    if (typeof budget === 'number' && choice.deltas.cash < 0) {
      const drop = Math.abs(choice.deltas.cash / 100) * budget;
      setRemainingBudget(prev => Math.max(0, (prev ?? budget) - drop));
    }

    const isComplete = newResources.cash <= 0 || currentScenarioIdx + 1 >= scenarios.length;

    // Persist decision to backend
    if (simulationId) {
      fetch(`${API_URL}/api/simulation/decision`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          simulationId,
          scenarioId: scenarios[currentScenarioIdx].id,
          choiceLabel: choice.label,
          deltas: choice.deltas,
          newResources,
          isComplete
        })
      }).catch(console.error);
    }

    if (isComplete) {
      setAppState('report');
    } else {
      setCurrentScenarioIdx(prev => prev + 1);
    }
  };

  // ── HELPERS ──


  const hasInterviewed = (p: Persona) => {
    const userMessages = p.history.filter(m => m.role === 'user');
    return userMessages.length >= 1;
  };

  const isGaugeWarning = (v: number) => v <= 15;
  const gaugeColor = (v: number) => v <= 15 ? '#ef4444' : v <= 35 ? '#f59e0b' : '#10b981';

  // ── PROGRESS BAR ──
  const renderProgress = () => {
    const steps = [
      { id: 1, label: t('discovery'), state: ['form','personas','chat'].includes(appState) ? 'active' : 'done' },
      { id: 2, label: t('evaluation'), state: appState === 'evaluation' ? 'active' : ['operational','report'].includes(appState) ? 'done' : 'pending' },
      { id: 3, label: t('operations'), state: appState === 'operational' ? 'active' : appState === 'report' ? 'done' : 'pending' },
      { id: 4, label: t('report'), state: appState === 'report' ? 'active' : 'pending' },
    ];
    return (
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'2rem', padding:'1rem 1.25rem', background:'var(--bg-base)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-light)' }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'0.5rem', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background: s.state==='done' ? 'var(--accent-primary)' : s.state==='active' ? 'var(--accent-primary)' : 'var(--bg-surface-hover)', color: s.state !== 'pending' ? '#fff' : 'var(--text-muted)', fontSize:'0.8rem', fontWeight:700 }}>
              {s.state === 'done' ? <CheckCircle2 size={16}/> : s.id}
            </div>
            <span style={{ fontSize:'0.82rem', fontWeight:600, color: s.state==='active' ? 'var(--text-primary)' : s.state==='done' ? 'var(--accent-primary)' : 'var(--text-muted)', whiteSpace:'nowrap' }}>{s.label}</span>
            {i < steps.length - 1 && <div style={{ flex:1, height:'2px', background: s.state==='done' ? 'var(--accent-primary)' : 'var(--border-light)', margin:'0 0.25rem', minWidth:20 }}/>}
          </div>
        ))}
      </div>
    );
  };

  // ── RESOURCE GAUGES ──
  const renderGauges = () => {
    const budgetDisplay = remainingBudget != null
      ? `₹${Math.round(remainingBudget).toLocaleString('en-IN')}`
      : null;
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {[
          { label:`💰 ${t('budgetRunway').replace('💰 ', '')}`, value:resources.cash, extra: budgetDisplay },
          { label:`🌱 ${t('socialImpact').replace('🌱 ', '')}`, value:resources.impact, extra: null },
          { label:`🤝 ${t('communityTrust').replace('🤝 ', '')}`, value:resources.trust, extra: null },
        ].map(({ label, value, extra }) => (
          <div key={label} style={{ background:'var(--bg-base)', border:`1px solid ${isGaugeWarning(value) ? '#ef4444' : 'var(--border-light)'}`, borderRadius:'var(--radius-md)', padding:'1rem', transition:'border-color 0.3s' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem' }}>
              <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: extra ? '0.9rem' : '1.2rem', fontWeight:800, color: gaugeColor(value) }}>{extra ?? value}</span>
            </div>
            <div style={{ height:6, background:'var(--bg-surface-hover)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${value}%`, height:'100%', background: gaugeColor(value), borderRadius:3, transition:'width 0.6s ease-out, background 0.3s' }}/>
            </div>
            {isGaugeWarning(value) && <div style={{ fontSize:'0.72rem', color:'#ef4444', marginTop:'0.35rem', fontWeight:600 }}>{t('criticalLevel')}</div>}
          </div>
        ))}
      </div>
    );
  };

  // ─────────────────────────────────────────────────
  // RENDER: FORM (Stage 1 start)
  // ─────────────────────────────────────────────────
  if (appState === 'form') {
    return (
      <main style={{ display:'flex', flexDirection:'column', flex:1, width:'100%' }}>
        {simulationId && renderProgress()}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1 }}>
          <div style={{ width:'100%', maxWidth:'700px', animation:'fadeIn 0.4s ease-out' }}>
            <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
              <div className="eyebrow-tag" style={{ marginBottom:'1rem' }}>{t('round').toUpperCase()} {round} — {t('discovery').toUpperCase()}</div>
              <h1 className="hero-title" style={{ fontSize:'clamp(1.8rem,3.5vw,2.5rem)' }}>{t('coreProblemStatement')}</h1>
              <p className="hero-subtitle" style={{ margin:'0 auto', maxWidth:500, fontSize:'1rem' }}>
                {round === 1
                  ? t('askProbing')
                  : `${t('refineStatement')} ${round - 1})`}
              </p>
            </div>
            <div style={{ background:'var(--bg-base)', padding:'2.5rem', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-light)', boxShadow:'var(--shadow-md)' }}>
              {error && <div style={{ color:'var(--error)', marginBottom:'1.5rem', fontSize:'0.9rem', textAlign:'center' }}>{error}</div>}
              <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontWeight:600, color:'var(--text-primary)', marginBottom:'0.75rem' }}>
                <Sparkles size={18} style={{ color:'var(--accent-primary)' }}/> {t('coreProblemStatement')}
              </label>
              <textarea
                className="flat-input"
                style={{ height:130, resize:'vertical', fontSize:'1rem', background:'var(--bg-surface)', padding:'1rem', borderRadius:'var(--radius-md)', border:'1px solid var(--border-light)', lineHeight:1.6 }}
                value={problem}
                onChange={e => setProblem(e.target.value)}
                onBlur={() => handleSaveDraft()}
              />

              {/* Budget Input */}
              <div style={{ marginTop:'1.25rem' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontWeight:600, color:'var(--text-primary)', marginBottom:'0.5rem', fontSize:'0.9rem' }}>
                  {t('operationalBudget')}
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', fontWeight:700, color:'var(--text-secondary)', fontSize:'1rem' }}>₹</span>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    className="flat-input"
                    style={{ paddingLeft:'2rem', width:'100%', fontSize:'1rem', background:'var(--bg-surface)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-light)' }}
                    placeholder="5,00,000"
                    value={budget}
                    onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.35rem' }}>{t('budgetHint')}</p>
              </div>

              <button
                className="btn-solid btn-lg"
                style={{ width:'100%', marginTop:'1.5rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}
                disabled={!problem.trim() || isLoading}
                onClick={handleStartSimulation}
              >
                {isLoading ? <div className="loader-white"/> : <><BrainCircuit size={18}/> {simulationId ? t('updateContinue') : t('generatePersonas')}</>}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: PERSONAS — Neighbourhood Survey
  // ─────────────────────────────────────────────────
  if (appState === 'personas') {
    const interviewedCount = personas.filter(hasInterviewed).length;
    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'fadeIn 0.3s ease-out' }}>
        {renderProgress()}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <div className="eyebrow-tag" style={{ marginBottom:'0.6rem' }}>{t('neighbourhoodSurvey').toUpperCase()} — {t('round').toUpperCase()} {round}</div>
            <h2 style={{ fontSize:'1.7rem', fontWeight:700, color:'var(--text-primary)', marginBottom:'0.35rem' }}>{t('discoverRootCause')}</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.95rem' }}>
              {t('askProbing')}
              <span style={{ marginLeft:'1rem', color:'var(--accent-primary)', fontWeight:600 }}>{interviewedCount}/{personas.length} {t('interviewed')}</span>
            </p>
          </div>
          <button onClick={handleEvaluate} disabled={isLoading || interviewedCount === 0} className="btn-solid"
            style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--success)', opacity: interviewedCount === 0 ? 0.5 : 1 }}>
            {isLoading ? <div className="loader-white"/> : <><Activity size={16}/> {t('generateIntelReport')}</>}
          </button>
        </div>
        {error && <div style={{ color:'var(--error)', marginBottom:'1rem', fontSize:'0.9rem' }}>{error}</div>}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:'1rem', overflowY:'auto', paddingBottom:'1.5rem' }}>
          {personas.map(p => {
            const done = hasInterviewed(p);
            return (
              <div key={p._id} style={{ background:'var(--bg-base)', border:`1px solid ${done ? 'var(--success)' : 'var(--border-light)'}`, borderRadius:'var(--radius-lg)', padding:'1.25rem', boxShadow:'var(--shadow-sm)', transition:'border-color 0.3s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.85rem' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background: done ? 'rgba(16,185,129,0.1)' : 'var(--bg-surface-hover)', display:'flex', alignItems:'center', justifyContent:'center', color: done ? 'var(--success)' : 'var(--accent-primary)' }}>
                    <UserCircle size={22}/>
                  </div>
                  <div>
                    <div style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{p.occupation}, {p.age}</div>
                  </div>
                </div>
                <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', lineHeight:1.5, marginBottom:'1rem', height:'4em', overflow:'hidden' }}>{p.bio}</p>
                <button
                  onClick={() => openChat(p)}
                  className={done ? 'btn-outline' : 'btn-solid'}
                  style={{ width:'100%', fontSize:'0.85rem', padding:'0.55rem', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                  {done ? t('continueInterview') : t('startInterview')}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: CHAT — Interview a Persona
  // ─────────────────────────────────────────────────
  if (appState === 'chat' && selectedPersona) {
    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'fadeIn 0.2s ease-out' }}>
        <button onClick={() => setAppState('personas')} style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'none', border:'none', color:'var(--text-secondary)', fontWeight:600, cursor:'pointer', marginBottom:'1rem', fontSize:'0.95rem' }}>
          <ArrowLeft size={16}/> {t('backToBoard')}
        </button>

        <div style={{ flex:1, background:'var(--bg-base)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-light)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'var(--shadow-md)' }}>
          {/* Header */}
          <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--bg-surface-hover)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-primary)' }}>
                <UserCircle size={22}/>
              </div>
              <div>
                <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{selectedPersona.name}</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{selectedPersona.occupation}</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            {/* Intro context */}
            <div style={{ background:'var(--bg-surface)', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', fontSize:'0.85rem', color:'var(--text-muted)', fontStyle:'italic', border:'1px solid var(--border-light)' }}>
              You approach {selectedPersona.name}. They look open to talking. Your problem: "{problem.substring(0,80)}..."
            </div>
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth:'80%',
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                padding:'0.9rem 1.1rem',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-light)',
                fontSize:'0.95rem', lineHeight:1.55
              }}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf:'flex-start', background:'var(--bg-surface)', padding:'1rem', borderRadius:'16px', border:'1px solid var(--border-light)' }}>
                <div style={{ display:'flex', gap:'0.35rem' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'var(--text-muted)', animation:`bounce 1s ${i*0.15}s infinite` }}/>)}
                </div>
              </div>
            )}
            <div ref={chatBottomRef}/>
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} style={{ padding:'1.25rem', borderTop:'1px solid var(--border-light)', display:'flex', gap:'0.75rem' }}>
            <input
              type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              disabled={isLoading}
              placeholder={t('askQuestion')}
              style={{ flex:1, padding:'0.85rem 1.25rem', borderRadius:'var(--radius-pill)', border:'1px solid var(--border-light)', background:'var(--bg-surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:'0.95rem' }}
            />
            <button type="submit" disabled={isLoading} className="btn-solid"
              style={{ borderRadius:'50%', width:46, height:46, padding:0, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Send size={18}/>
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: EVALUATION — Discovery Intel Report
  // ─────────────────────────────────────────────────
  if (appState === 'evaluation' && evaluation) {
    const scoreColor = evaluation.score >= 70 ? '#10b981' : evaluation.score >= 40 ? '#f59e0b' : '#ef4444';
    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'fadeIn 0.4s ease-out' }}>
        {renderProgress()}
        <div style={{ background:'#0f172a', padding:'2.5rem', borderRadius:'1.5rem', color:'#fff', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'var(--shadow-lg)', marginBottom:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <ShieldAlert size={22} style={{ color:'var(--accent-primary)' }}/>
              <span style={{ fontSize:'0.85rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.7 }}>{t('discoveryReport')}</span>
            </div>
            <div style={{ padding:'0.3rem 0.75rem', background:'rgba(255,255,255,0.05)', borderRadius:'var(--radius-pill)', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.05em' }}>GROQ AI</div>
          </div>

          {/* Score bar */}
          <div style={{ marginBottom:'2.5rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'0.65rem' }}>
              <span style={{ fontSize:'1.1rem', fontWeight:600 }}>Root Cause Discovery Score</span>
              <div style={{ display:'flex', alignItems:'baseline', gap:'0.75rem' }}>
                <span style={{ fontSize:'2.4rem', fontWeight:800, color: scoreColor }}>{evaluation.score}</span>
                <span style={{ background:'rgba(255,255,255,0.08)', padding:'0.2rem 0.65rem', borderRadius:6, fontSize:'0.82rem' }}>{evaluation.riskLabel}</span>
              </div>
            </div>
            <div style={{ height:8, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${evaluation.score}%`, height:'100%', background:`linear-gradient(90deg, ${scoreColor}, ${scoreColor}aa)`, transition:'width 1s ease-out' }}/>
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'2rem' }}>
            {[
              { label:'Discovery Precision', value: evaluation.winRate },
              { label:'Discipline Score', value: evaluation.discipline },
            ].map(m => (
              <div key={m.label} style={{ background:'rgba(255,255,255,0.03)', padding:'1.25rem', borderRadius:'1rem', border:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', fontWeight:600, marginBottom:'0.4rem' }}>{m.label}</div>
                <div style={{ fontSize:'1.7rem', fontWeight:700 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Behavioral tags */}
          <div style={{ marginBottom:'2rem' }}>
            <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:'0.08em', marginBottom:'0.75rem' }}>BEHAVIOURAL SIGNATURES</div>
            <div style={{ display:'flex', gap:'0.65rem', flexWrap:'wrap' }}>
              {evaluation.behavioralTags?.map((tag, i) => (
                <span key={i} style={{ padding:'0.4rem 0.9rem', background:'rgba(37,99,235,0.12)', border:'1px solid rgba(37,99,235,0.3)', borderRadius:'var(--radius-pill)', fontSize:'0.83rem', color:'#60a5fa' }}>• {tag}</span>
              ))}
            </div>
          </div>

          {/* Tactical feedback */}
          <div style={{ background:'rgba(37,99,235,0.06)', borderLeft:'3px solid var(--accent-primary)', padding:'1.25rem 1.5rem', borderRadius:'0 0.5rem 0.5rem 0' }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--accent-primary)', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>TACTICAL FEEDBACK</div>
            <p style={{ lineHeight:1.7, fontSize:'0.93rem', color:'rgba(255,255,255,0.78)', margin:0 }}>{evaluation.tacticalStance}</p>
          </div>
        </div>

        <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
          <button onClick={() => setAppState('form')} className="btn-outline"
            style={{ display:'flex', alignItems:'center', gap:'0.5rem', flex:1, justifyContent:'center', padding:'0.85rem' }}>
            <RefreshCw size={16}/> {t('refineStatement')} {round + 1})
          </button>
          <button onClick={handleEnterOperational} disabled={isLoading} className="btn-solid btn-lg"
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
            {isLoading ? <div className="loader-white"/> : <><Zap size={16}/> {t('enterOperational')}</>}
          </button>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: OPERATIONAL — Decision Scenarios
  // ─────────────────────────────────────────────────
  if (appState === 'operational' && scenarios.length > 0) {
    const scenario = scenarios[currentScenarioIdx];
    const isFundingCrisis = resources.cash <= 15;
    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'fadeIn 0.3s ease-out' }}>
        {renderProgress()}
        {renderGauges()}

        {isFundingCrisis && (
          <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius-md)', padding:'0.85rem 1.25rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.75rem', color:'#ef4444' }}>
            <AlertTriangle size={18}/>
            <span>{t('fundingCrisis')}</span>
          </div>
        )}

        <div style={{ background:'var(--bg-base)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-lg)', padding:'2rem', boxShadow:'var(--shadow-md)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem' }}>
            <div className="eyebrow-tag">{t('scenario').toUpperCase()} {currentScenarioIdx + 1} {t('of').toUpperCase()} {scenarios.length}</div>
            <div style={{ height:1, flex:1, background:'var(--border-light)' }}/>
          </div>

          <h2 style={{ fontSize:'1.5rem', fontWeight:700, color:'var(--text-primary)', marginBottom:'0.85rem' }}>{scenario.title}</h2>
          <p style={{ color:'var(--text-secondary)', lineHeight:1.7, marginBottom:'2rem', fontSize:'1rem' }}>{scenario.description}</p>

          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            {scenario.choices.map((choice, i) => (
              <button key={choice.id} onClick={() => handleDecision(choice)}
                style={{ textAlign:'left', padding:'1rem 1.25rem', borderRadius:'var(--radius-md)', border:'1.5px solid var(--border-light)', background:'var(--bg-surface)', cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit', display:'flex', alignItems:'flex-start', gap:'1rem' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-base)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(37,99,235,0.1)', color:'var(--accent-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.85rem', flexShrink:0 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:'0.25rem' }}>{choice.label}</div>
                  <div style={{ display:'flex', gap:'0.75rem', fontSize:'0.78rem', color:'var(--text-muted)' }}>
                    <span style={{ color: choice.deltas.cash < 0 ? '#ef4444' : '#10b981' }}>Cash {choice.deltas.cash > 0 ? '+' : ''}{choice.deltas.cash}</span>
                    <span style={{ color: choice.deltas.impact > 0 ? '#10b981' : '#f59e0b' }}>Impact {choice.deltas.impact > 0 ? '+' : ''}{choice.deltas.impact}</span>
                    <span style={{ color: choice.deltas.trust > 0 ? '#10b981' : '#ef4444' }}>Trust {choice.deltas.trust > 0 ? '+' : ''}{choice.deltas.trust}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: REPORT — Post-Mortem
  // ─────────────────────────────────────────────────
  if (appState === 'report') {
    const survived = resources.cash > 0;
    const impactScore = resources.impact;
    const trustScore = resources.trust;
    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'slideUp 0.5s ease-out' }}>
        {renderProgress()}
        <div style={{ background: survived ? 'linear-gradient(135deg, #064e3b, #065f46)' : 'linear-gradient(135deg, #1f2937, #111827)', padding:'2.5rem', borderRadius:'1.5rem', color:'#fff', boxShadow:'var(--shadow-lg)', marginBottom:'1.5rem' }}>
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <div style={{ fontSize:'3.5rem', marginBottom:'1rem' }}>{survived ? '🏆' : '📉'}</div>
            <h2 style={{ fontSize:'1.8rem', fontWeight:800, marginBottom:'0.5rem' }}>{survived ? t('ventureSurvived') : t('ventureFailed')}</h2>
            <p style={{ opacity:0.7, fontSize:'1rem' }}>{survived ? `You balanced impact and sustainability across ${decisionLog.length} operational decisions.` : 'Your cash runway hit zero. This is the most common reason social ventures fail.'}</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'2rem' }}>
            {[
              { label:'Final Cash', value:`${resources.cash}%`, color: resources.cash > 30 ? '#10b981' : '#ef4444' },
              { label:'Social Impact', value:`${impactScore}%`, color:'#60a5fa' },
              { label:'Strategic Trust', value:`${trustScore}%`, color:'#a78bfa' },
            ].map(m => (
              <div key={m.label} style={{ background:'rgba(255,255,255,0.06)', padding:'1.25rem', borderRadius:'1rem', textAlign:'center' }}>
                <div style={{ fontSize:'0.75rem', opacity:0.55, fontWeight:600, marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</div>
                <div style={{ fontSize:'2rem', fontWeight:800, color:m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Decision replay */}
          <div style={{ marginBottom:'1.5rem' }}>
            <div style={{ fontSize:'0.75rem', opacity:0.45, fontWeight:700, letterSpacing:'0.08em', marginBottom:'0.85rem' }}>{t('decisionLog').toUpperCase()}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {decisionLog.map((d, i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.04)', padding:'0.75rem 1rem', borderRadius:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.88rem' }}>
                  <span style={{ opacity:0.8 }}>{i+1}. {d.choiceLabel}</span>
                  <div style={{ display:'flex', gap:'0.75rem', fontSize:'0.78rem' }}>
                    <span style={{ color: d.deltas.cash < 0 ? '#fca5a5' : '#6ee7b7' }}>Cash {d.deltas.cash > 0 ? '+' : ''}{d.deltas.cash}</span>
                    <span style={{ color:'#93c5fd' }}>Impact +{d.deltas.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {evaluation && (
            <div style={{ background:'rgba(255,255,255,0.04)', padding:'1.25rem', borderRadius:'1rem', borderLeft:'3px solid var(--accent-primary)' }}>
              <div style={{ fontSize:'0.72rem', opacity:0.5, fontWeight:700, letterSpacing:'0.08em', marginBottom:'0.4rem' }}>{t('discoveryInsight').toUpperCase()}</div>
              <p style={{ fontSize:'0.9rem', opacity:0.78, lineHeight:1.65, margin:0 }}>{evaluation.tacticalStance}</p>
            </div>
          )}
        </div>

        <button onClick={() => { setProblem(''); setSimulationId(''); setRound(1); setPersonas([]); setEvaluation(null); setDecisionLog([]); setResources({cash:80,impact:20,trust:50}); setAppState('form'); }}
          className="btn-solid btn-lg" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
          <RefreshCw size={16}/> {t('startNewSimulation')}
        </button>
      </main>
    );
  }

  return null;
}

export default function FounderFlow() {
  return (
    <div className="landing-layout">
      <Navbar/>
      <div className="landing-main" style={{ padding:'2rem 2.5rem', display:'flex', flex:1 }}>
        <FounderFlowContent/>
      </div>
    </div>
  );
}

// ── FALLBACK SCENARIOS (no backend needed) ──
function getFallbackScenarios(problem: string): Scenario[] {
  return [
    {
      id: 's1',
      title: 'Government Permit Delay',
      description: `A local official has been delaying your operating license for 3 weeks, citing "incomplete documentation" related to your work on: "${problem.substring(0, 60)}..."`,
      choices: [
        { id: 'A', label: 'Escalate to senior department head', deltas: { cash: -10, impact: 0, trust: +20 } },
        { id: 'B', label: 'Rally community members to petition', deltas: { cash: -5, impact: +15, trust: +10 } },
        { id: 'C', label: 'Hire a compliance consultant', deltas: { cash: -25, impact: 0, trust: +5 } },
        { id: 'D', label: 'Continue operations informally (risk)', deltas: { cash: +5, impact: +10, trust: -25 } },
      ]
    },
    {
      id: 's2',
      title: 'Key Team Member Quits',
      description: 'Your operations lead — the person managing community relationships — has resigned, citing burnout. The community relies on their presence.',
      choices: [
        { id: 'A', label: 'Promote a junior team member immediately', deltas: { cash: +5, impact: -5, trust: -10 } },
        { id: 'B', label: 'Hire an experienced replacement quickly', deltas: { cash: -30, impact: 0, trust: +5 } },
        { id: 'C', label: 'Distribute responsibilities across team', deltas: { cash: +0, impact: -10, trust: +5 } },
        { id: 'D', label: 'Pause community programs temporarily', deltas: { cash: +10, impact: -20, trust: -15 } },
      ]
    },
    {
      id: 's3',
      title: 'Funding Source Pulls Out',
      description: 'Your primary grant (40% of runway) has been cancelled due to the funder restructuring their priorities. You have 6 weeks of cash left.',
      choices: [
        { id: 'A', label: 'Launch emergency crowdfunding campaign', deltas: { cash: +20, impact: +10, trust: +5 } },
        { id: 'B', label: 'Pivot to revenue-generating model', deltas: { cash: +5, impact: -10, trust: -5 } },
        { id: 'C', label: 'Cut non-core operations to extend runway', deltas: { cash: +15, impact: -15, trust: -5 } },
        { id: 'D', label: 'Apply for emergency grants (3–6 weeks to process)', deltas: { cash: -10, impact: 0, trust: +15 } },
      ]
    },
  ];
}
