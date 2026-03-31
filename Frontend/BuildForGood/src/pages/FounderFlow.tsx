import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import {
  Sparkles, UserCircle, Send, ArrowLeft, BrainCircuit,
  RefreshCw, CheckCircle2, Activity, ShieldAlert,
  AlertTriangle, Zap, UserPlus, Users
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import InvestorPitch from '../components/InvestorPitch';
import type { FundingOffer } from '../components/InvestorPitch';
import MVPBuilder from '../components/MVPBuilder';
import type { MVPFeature } from '../components/MVPBuilder';
import ReportCard from '../components/ReportCard';

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

type AppState = 'form' | 'personas' | 'chat' | 'evaluation' | 'operational' | 'operational_result' | 'cofounder_recruit' | 'mvp_builder' | 'investor_pitch' | 'compliance' | 'report';

interface ComplianceScheme { name: string; authority: string; inrBenefit: string; eligibility: string; howToApply: string; }
interface LegalRequirement { item: string; description: string; priority: 'mandatory' | 'recommended' | 'optional'; timeline: string; }
interface ComplianceRisk { issue: string; description: string; severity: 'high' | 'medium' | 'low'; mitigation: string; }
interface ComplianceData { overview: string; schemes: ComplianceScheme[]; legalRequirements: LegalRequirement[]; risks: ComplianceRisk[]; }

interface CoFounderProfile {
  _id: string;
  name: string;
  domain: string;
  tier: 'Newbie' | 'Amateur' | 'Professional';
  score: number;
  specialty: string;
  price: number;
  rating: number;
  bio: string;
  isRecruited?: boolean;
}

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

  // ── CO-FOUNDER RECRUIT STATE ──
  const [cofounderDomain, setCofounderDomain] = useState<string>('All');
  const [cofounderTier, setCofounderTier]     = useState<string>('All');
  const [cofounderProfiles, setCofounderProfiles] = useState<CoFounderProfile[]>([]);
  const [isGeneratingCofounders, setIsGeneratingCofounders] = useState(false);
  const [selectedCofounder, setSelectedCofounder] = useState<CoFounderProfile | null>(null);

  // ── INVESTOR FUNDING STATE ──
  const [fundingDetails, setFundingDetails] = useState<FundingOffer | null>(null);

  // ── MVP BUILDER STATE ──
  const [mvpFeatures, setMvpFeatures] = useState<MVPFeature[]>([]);

  // ── COMPLIANCE STATE ──
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);
  const [complianceError, setComplianceError] = useState('');

  // ── SHARE MODAL STATE ──
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'ngrok-skip-browser-warning': 'true'
  });

  // ── Publish post to community ──
  const handlePublishPost = async () => {
    if (!simulationId) return;
    setIsPosting(true);
    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ simulationId, caption: shareCaption })
      });
      if (res.ok) {
        setPosted(true);
        setTimeout(() => setShowShareModal(false), 1800);
      }
    } catch { /* ignore */ }
    finally { setIsPosting(false); }
  };

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
            
            // Re-route based on saved progress to resume exactly where the founder left off
            if (data.pitchComplete) {
              setAppState('compliance');
              if (data.fundingInvestor) {
                setFundingDetails({ investorName: data.fundingInvestor, amount: data.fundingAmount, equity: data.fundingEquity });
              }
              if (data.mvpFeatures) setMvpFeatures(data.mvpFeatures);
            } else if (data.mvpComplete) {
              setAppState('investor_pitch');
              if (data.mvpFeatures) setMvpFeatures(data.mvpFeatures);
            } else if (data.coFounderId || data.coFounderSkipped) {
              setAppState('mvp_builder');
            } else {
              setAppState('cofounder_recruit');
            }

            // Restore partial cofounder details for the report page
            if (data.coFounderId) {
              setSelectedCofounder({
                _id: data.coFounderId,
                name: data.coFounderName,
                tier: data.coFounderTier as 'Newbie' | 'Amateur' | 'Professional',
                price: data.coFounderPrice,
                specialty: data.coFounderSpecialty || 'Expert',
                score: 0, rating: 0, bio: '', domain: ''
              });
            }
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
      setAppState('operational_result');
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
      { id: 2, label: t('evaluation'), state: appState === 'evaluation' ? 'active' : ['operational','operational_result','cofounder_recruit','mvp_builder','investor_pitch','compliance','report'].includes(appState) ? 'done' : 'pending' },
      { id: 3, label: t('operations'), state: ['operational','operational_result'].includes(appState) ? 'active' : ['cofounder_recruit','mvp_builder','investor_pitch','compliance','report'].includes(appState) ? 'done' : 'pending' },
      { id: 4, label: 'Co-Founder', state: appState === 'cofounder_recruit' ? 'active' : ['mvp_builder','investor_pitch','compliance','report'].includes(appState) ? 'done' : 'pending' },
      { id: 5, label: 'MVP', state: appState === 'mvp_builder' ? 'active' : ['investor_pitch','compliance','report'].includes(appState) ? 'done' : 'pending' },
      { id: 6, label: 'Investor', state: appState === 'investor_pitch' ? 'active' : ['compliance','report'].includes(appState) ? 'done' : 'pending' },
      { id: 7, label: 'Govt Subsidies & Schemes', state: appState === 'compliance' ? 'active' : appState === 'report' ? 'done' : 'pending' },
      { id: 8, label: t('report'), state: appState === 'report' ? 'active' : 'pending' },
    ];
    return (
      <div className="progress-wrapper" style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'2rem', padding:'1rem 1.25rem', background:'var(--bg-base)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-light)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'fadeIn 0.3s ease-out' }}>
        {renderProgress()}
        {renderGauges()}

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
                  <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{choice.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: OPERATIONAL RESULT — Option to Retake
  // ─────────────────────────────────────────────────
  if (appState === 'operational_result') {
    return (
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out' }}>
        {renderProgress()}
        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{resources.cash <= 15 ? '💥' : '🚀'}</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {resources.cash <= 15 ? 'Critical Condition (Low Cash)' : 'Operations Complete'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Final Resources — <strong style={{color: resources.cash <= 15 ? '#ef4444' : '#10b981'}}>Cash: {resources.cash}</strong> | Impact: {resources.impact} | Trust: {resources.trust}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-outline" onClick={() => {
              setResources({ cash: 50, impact: 50, trust: 50 });
              setCurrentScenarioIdx(0);
              setDecisionLog([]);
              if (budget) setRemainingBudget(Number(budget));
              setAppState('operational');
            }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={16}/> Retake Operations Round
            </button>
            <button className="btn-solid" onClick={() => setAppState('cofounder_recruit')} disabled={resources.cash <= 0} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: resources.cash <= 0 ? 0.5 : 1 }}>
              Proceed to Co-founder →
            </button>
          </div>
          {resources.cash <= 0 && <p style={{ color: 'var(--error)', marginTop: '1rem', fontWeight: 600 }}>Your startup ran out of funds. You must retake this round to continue.</p>}
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: CO-FOUNDER RECRUITMENT — After Operational
  // ─────────────────────────────────────────────────
  if (appState === 'cofounder_recruit') {
    const tierColor = (t: string) => t === 'Professional' ? '#8b5cf6' : t === 'Amateur' ? '#f59e0b' : '#10b981';

    // Auto-detect domain from problem statement
    const detectProblemDomain = (p: string): string => {
      const lower = p.toLowerCase();
      if (lower.includes('health') || lower.includes('clinic') || lower.includes('medical') || lower.includes('hospital')) return 'Health & Wellness';
      if (lower.includes('climate') || lower.includes('solar') || lower.includes('carbon') || lower.includes('waste') || lower.includes('environment')) return 'Climate & Environment';
      if (lower.includes('education') || lower.includes('school') || lower.includes('learn') || lower.includes('student')) return 'Education';
      if (lower.includes('farm') || lower.includes('agri') || lower.includes('crop') || lower.includes('soil')) return 'Agriculture';
      if (lower.includes('finance') || lower.includes('loan') || lower.includes('credit') || lower.includes('bank') || lower.includes('fintech')) return 'Fintech & Inclusion';
      return 'Social Impact';
    };

    const CF_DOMAINS = ['All', 'Climate & Environment', 'Health & Wellness', 'Education', 'Fintech & Inclusion', 'Agriculture', 'Social Impact'];
    const CF_TIERS   = ['All', 'Newbie', 'Amateur', 'Professional'];

    // initialise domain from problem statement on first render
    const detectedDomain = detectProblemDomain(problem);

    const handleLoadPool = async (domain: string, tier: string) => {
      setIsGeneratingCofounders(true);
      try {
        const params = new URLSearchParams();
        if (domain !== 'All') params.set('domain', domain);
        if (tier   !== 'All') params.set('tier',   tier);
        const url = `${API_URL}/api/cofounder/pool${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url, { headers: getHeaders() });
        if (res.ok) {
          const data: CoFounderProfile[] = await res.json();
          setCofounderProfiles(data);
        } else {
          setCofounderProfiles([]);
        }
      } catch {
        setCofounderProfiles([]);
      } finally {
        setIsGeneratingCofounders(false);
      }
    };

    const handleRecruit = async (cf: CoFounderProfile) => {
      setSelectedCofounder(cf);
      try {
        await fetch(`${API_URL}/api/cofounder/recruit`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ coFounderId: cf._id, simulationId })
        });
        setCofounderProfiles(prev => prev.filter(p => p._id !== cf._id));
      } catch { /* optimistic */ }
    };

    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'fadeIn 0.3s ease-out' }}>
        {renderProgress()}

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🤝</div>
          <h2 style={{ fontSize:'1.8rem', fontWeight:800, color:'var(--text-primary)', marginBottom:'0.5rem' }}>Recruit a Co-Founder</h2>
          <p style={{ color:'var(--text-secondary)', maxWidth:540, margin:'0 auto', lineHeight:1.6 }}>
            Browse quiz-verified applicants. Filter by <strong>domain</strong> or <strong>tier</strong>, then recruit the right match for your venture.
          </p>
        </div>

        {/* Recruited confirmation */}
        {selectedCofounder ? (
          <div style={{ maxWidth:560, margin:'0 auto', width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🎉</div>
            <h3 style={{ fontWeight:800, fontSize:'1.4rem', color:'var(--text-primary)', marginBottom:'0.4rem' }}>
              {selectedCofounder.name} is on board!
            </h3>
            <p style={{ color:'var(--text-secondary)', lineHeight:1.6, marginBottom:'1.5rem' }}>
              <strong>{selectedCofounder.specialty}</strong> · {selectedCofounder.tier} · {selectedCofounder.domain}
              <br/>₹{selectedCofounder.price.toLocaleString('en-IN')}/month
            </p>
            <button onClick={() => setAppState('mvp_builder')} className="btn-solid btn-lg"
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
              <Zap size={16}/> Build your MVP →
            </button>
          </div>
        ) : (
          <div style={{ maxWidth:1050, margin:'0 auto', width:'100%' }}>

            {/* Auto-detected domain hint */}
            <div style={{ background:'rgba(37,99,235,0.05)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:'var(--radius-md)', padding:'0.75rem 1.1rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.88rem' }}>
              <span style={{ fontSize:'1rem' }}>🎯</span>
              <span style={{ color:'var(--text-secondary)' }}>Detected domain for your problem: <strong style={{ color:'var(--accent-primary)' }}>{detectedDomain}</strong>. Pre-filtered below — change anytime.</span>
            </div>

            {/* DOMAIN filter row */}
            <div style={{ marginBottom:'0.75rem' }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>DOMAIN</div>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                {CF_DOMAINS.map(d => {
                  const isAuto = d === detectedDomain && cofounderDomain === 'All';
                  const isActive = cofounderDomain === d;
                  return (
                    <button key={d} onClick={() => setCofounderDomain(d)}
                      style={{ padding:'0.35rem 0.9rem', borderRadius:'var(--radius-pill)', border:`1.5px solid ${isActive || isAuto ? 'var(--accent-primary)' : 'var(--border-light)'}`, background: isActive ? 'var(--accent-primary)' : isAuto ? 'rgba(37,99,235,0.08)' : 'var(--bg-base)', color: isActive ? '#fff' : 'var(--text-primary)', fontWeight:600, fontSize:'0.8rem', cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                      {d}{isAuto && d !== 'All' ? ' ✦' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TIER filter row */}
            <div style={{ marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>TIER</div>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                {CF_TIERS.map(tr => {
                  const isActive = cofounderTier === tr;
                  const tc = tr === 'Professional' ? '#8b5cf6' : tr === 'Amateur' ? '#f59e0b' : tr === 'Newbie' ? '#10b981' : 'var(--text-primary)';
                  return (
                    <button key={tr} onClick={() => setCofounderTier(tr)}
                      style={{ padding:'0.35rem 0.9rem', borderRadius:'var(--radius-pill)', border:`1.5px solid ${isActive ? tc : 'var(--border-light)'}`, background: isActive ? `${tc}15` : 'var(--bg-base)', color: isActive ? tc : 'var(--text-primary)', fontWeight:600, fontSize:'0.8rem', cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit' }}>
                      {tr === 'Newbie' ? '🌱 ' : tr === 'Amateur' ? '⚡ ' : tr === 'Professional' ? '👑 ' : ''}{tr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions row */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.75rem', marginBottom:'1.5rem' }}>
              <button onClick={() => { 
                setAppState('mvp_builder');
                fetch(`${API_URL}/api/simulation/progress`, {
                  method: 'POST',
                  headers: getHeaders(),
                  body: JSON.stringify({ simulationId, coFounderSkipped: true })
                }).catch(console.error);
              }}
                className="btn-outline" style={{ padding:'0.6rem 1.1rem', fontSize:'0.88rem' }}>
                Skip → Build MVP
              </button>
              <button
                onClick={() => {
                  const effectiveDomain = cofounderDomain === 'All' ? detectedDomain : cofounderDomain;
                  handleLoadPool(effectiveDomain, cofounderTier);
                }}
                disabled={isGeneratingCofounders}
                className="btn-solid" style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.65rem 1.2rem', fontSize:'0.88rem' }}>
                {isGeneratingCofounders ? <div className="loader-white" style={{ width:14, height:14 }}/> : <><Users size={14}/> Browse Pool</>}
              </button>
            </div>

            {/* Pool results */}
            {cofounderProfiles.length === 0 && !isGeneratingCofounders && (
              <div style={{ textAlign:'center', padding:'3rem 2rem', background:'var(--bg-base)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-light)' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🔍</div>
                <h3 style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:'0.4rem' }}>No applicants found</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem', maxWidth:380, margin:'0 auto' }}>
                  Click <strong>Browse Pool</strong> to load available co-founders. Try <strong>All</strong> domain or <strong>All</strong> tier if none appear — co-founders appear here after completing the quiz in the Co-Founder Module.
                </p>
              </div>
            )}

            {cofounderProfiles.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'1.25rem' }}>
                {cofounderProfiles.map((cf) => {
                  const tc = tierColor(cf.tier);
                  return (
                    <div key={cf._id}
                      style={{ background:'var(--bg-base)', border:'2px solid var(--border-light)', borderRadius:'var(--radius-lg)', padding:'1.5rem', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', transition:'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = tc; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                        <div style={{ width:44, height:44, borderRadius:'50%', background:`${tc}18`, display:'flex', alignItems:'center', justifyContent:'center', color:tc, fontWeight:800, fontSize:'1.2rem' }}>
                          {cf.name.charAt(0)}
                        </div>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'0.25rem 0.65rem', borderRadius:'var(--radius-pill)', background:`${tc}15`, color:tc, textTransform:'uppercase' }}>
                          {cf.tier}
                        </span>
                      </div>
                      <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'1rem', marginBottom:'0.2rem' }}>{cf.name}</div>
                      <div style={{ fontSize:'0.8rem', color:'var(--accent-primary)', fontWeight:600, marginBottom:'0.2rem' }}>{cf.specialty}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        <span style={{ background:'var(--bg-surface)', padding:'0.15rem 0.5rem', borderRadius:'var(--radius-pill)', border:'1px solid var(--border-light)' }}>{cf.domain}</span>
                      </div>
                      <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.5, flex:1, marginBottom:'1rem' }}>{cf.bio}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.25rem', marginBottom:'0.75rem' }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ color: s <= Math.round(cf.rating) ? '#f59e0b' : 'var(--border-light)', fontSize:'0.85rem' }}>★</span>
                        ))}
                        <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginLeft:'0.35rem' }}>{cf.rating.toFixed(1)}</span>
                        <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'var(--text-muted)' }}>Score: {cf.score}/7</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'0.75rem', borderTop:'1px solid var(--border-light)' }}>
                        <div>
                          <span style={{ fontSize:'1.05rem', fontWeight:800, color:tc }}>₹{cf.price.toLocaleString('en-IN')}</span>
                          <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginLeft:'0.25rem' }}>/mo</span>
                        </div>
                        <button onClick={() => handleRecruit(cf)}
                          style={{ padding:'0.45rem 0.9rem', borderRadius:'var(--radius-md)', border:`1.5px solid ${tc}`, background:`${tc}12`, color:tc, fontWeight:700, fontSize:'0.8rem', cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                          <UserPlus size={13}/> Recruit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: MVP BUILDER
  // ─────────────────────────────────────────────────
  if (appState === 'mvp_builder') {
    const budgetForMvp = remainingBudget ?? (budget ? Number(budget) : 200000);
    return (
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out' }}>
        {renderProgress()}
        <div style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
          <MVPBuilder availableBudget={budgetForMvp} domain={problem} onComplete={async (features) => {
            setMvpFeatures(features);
            setAppState('investor_pitch');
            try {
              await fetch(`${API_URL}/api/simulation/progress`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                  simulationId,
                  mvpComplete: true,
                  mvpFeatures: features
                })
              });
            } catch (e) { console.error('Failed to save mvp state:', e); }
          }} />
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: INVESTOR PITCH — After MVP
  // ─────────────────────────────────────────────────
  if (appState === 'investor_pitch') {
    return (
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out' }}>
        {renderProgress()}
        <div style={{ flex: 1, position: 'relative' }}>
          <InvestorPitch problemStatement={problem} onComplete={async (offer) => { 
            setFundingDetails(offer);
            // Move to compliance check before report
            setAppState('compliance');
            setIsLoadingCompliance(true);
            setComplianceError('');
            try {
              await fetch(`${API_URL}/api/simulation/progress`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                  simulationId,
                  pitchComplete: true,
                  fundingInvestor: offer?.investorName || null,
                  fundingAmount: offer?.amount || null,
                  fundingEquity: offer?.equity || null
                })
              });
            } catch (e) { console.error('Failed to save pitch state:', e); }
            // Fetch compliance data
            try {
              const cres = await fetch(`${API_URL}/api/simulation/compliance`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ problemStatement: problem })
              });
              if (cres.ok) setComplianceData(await cres.json());
              else setComplianceError('Failed to load compliance insights.');
            } catch { setComplianceError('Network error loading compliance data.'); }
            finally { setIsLoadingCompliance(false); }
          }} />
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: COMPLIANCE — Government Policies & Legal
  // ─────────────────────────────────────────────────
  if (appState === 'compliance') {
    const priorityColor = (p: string) => p === 'mandatory' ? '#ef4444' : p === 'recommended' ? '#f59e0b' : '#10b981';
    const severityColor = (s: string) => s === 'high' ? '#ef4444' : s === 'medium' ? '#f59e0b' : '#10b981';
    const severityBg   = (s: string) => s === 'high' ? 'rgba(239,68,68,0.08)' : s === 'medium' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)';

    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'fadeIn 0.4s ease-out', paddingBottom:'3rem' }}>
        {renderProgress()}

        {/* ── HEADER ── */}
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🏛️</div>
          <h2 style={{ fontSize:'1.8rem', fontWeight:800, color:'var(--text-primary)', marginBottom:'0.5rem' }}>Government Subsidies & Schemes</h2>
          <p style={{ color:'var(--text-secondary)', maxWidth:560, margin:'0 auto', lineHeight:1.6, fontSize:'0.95rem' }}>
            Before your final report, review the government schemes, legal requirements, and regulatory risks specific to your venture.
          </p>
        </div>

        {/* ── LOADING ── */}
        {isLoadingCompliance && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem 0', gap:'1.25rem' }}>
            <div className="loader-white" style={{ width:36, height:36, borderColor:'var(--border-light)', borderLeftColor:'var(--accent-primary)', borderWidth:3 }}/>
            <p style={{ color:'var(--text-secondary)', fontWeight:500 }}>Analysing India-specific policies for your venture…</p>
          </div>
        )}

        {/* ── ERROR ── */}
        {!isLoadingCompliance && complianceError && (
          <div style={{ maxWidth:640, margin:'0 auto', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--radius-lg)', padding:'1.5rem 2rem', textAlign:'center' }}>
            <p style={{ color:'#ef4444', fontWeight:600, marginBottom:'1rem' }}>{complianceError}</p>
            <button className="btn-solid" onClick={() => setAppState('report')}>Skip to Report →</button>
          </div>
        )}

        {/* ── CONTENT ── */}
        {!isLoadingCompliance && complianceData && (
          <div style={{ maxWidth:860, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column', gap:'2rem' }}>

            {/* Overview banner */}
            <div style={{ background:'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.06))', border:'1px solid rgba(37,99,235,0.18)', borderRadius:'var(--radius-lg)', padding:'1.25rem 1.75rem', borderLeft:'4px solid var(--accent-primary)' }}>
              <div style={{ fontSize:'0.72rem', fontWeight:800, color:'var(--accent-primary)', letterSpacing:'0.1em', marginBottom:'0.5rem' }}>REGULATORY LANDSCAPE</div>
              <p style={{ color:'var(--text-primary)', lineHeight:1.7, margin:0, fontSize:'0.97rem' }}>{complianceData.overview}</p>
            </div>

            {/* ── Government Schemes ── */}
            <div>
              <h3 style={{ fontSize:'1.15rem', fontWeight:800, color:'var(--text-primary)', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                🎁 Eligible Government Schemes & Benefits
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                {complianceData.schemes.map((s, i) => (
                  <div key={i} style={{ background:'var(--bg-base)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-lg)', padding:'1.25rem 1.5rem', boxShadow:'var(--shadow-sm)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', marginBottom:'0.6rem' }}>
                      <div>
                        <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'1rem', marginBottom:'0.2rem' }}>{s.name}</div>
                        <div style={{ fontSize:'0.78rem', color:'var(--accent-primary)', fontWeight:600 }}>{s.authority}</div>
                      </div>
                      <span style={{ flexShrink:0, padding:'0.3rem 0.75rem', borderRadius:'var(--radius-pill)', background:'rgba(16,185,129,0.1)', color:'#10b981', fontSize:'0.78rem', fontWeight:700 }}>
                        {s.inrBenefit}
                      </span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginTop:'0.75rem' }}>
                      <div style={{ background:'var(--bg-surface)', borderRadius:'var(--radius-md)', padding:'0.6rem 0.85rem' }}>
                        <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'0.25rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>Eligibility</div>
                        <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight:1.5 }}>{s.eligibility}</div>
                      </div>
                      <div style={{ background:'var(--bg-surface)', borderRadius:'var(--radius-md)', padding:'0.6rem 0.85rem' }}>
                        <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'0.25rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>How to Apply</div>
                        <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight:1.5 }}>{s.howToApply}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Legal Requirements ── */}
            <div>
              <h3 style={{ fontSize:'1.15rem', fontWeight:800, color:'var(--text-primary)', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                ⚖️ Legal Requirements & Registrations
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                {complianceData.legalRequirements.map((lr, i) => (
                  <div key={i} style={{ display:'flex', gap:'1rem', alignItems:'flex-start', background:'var(--bg-base)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', padding:'1rem 1.25rem' }}>
                    <div style={{ flexShrink:0, width:10, height:10, borderRadius:'50%', background:priorityColor(lr.priority), marginTop:5 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', marginBottom:'0.3rem' }}>
                        <span style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.95rem' }}>{lr.item}</span>
                        <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:'var(--radius-pill)', background:`${priorityColor(lr.priority)}18`, color:priorityColor(lr.priority), textTransform:'uppercase', letterSpacing:'0.06em' }}>
                          {lr.priority}
                        </span>
                      </div>
                      <p style={{ color:'var(--text-secondary)', fontSize:'0.87rem', lineHeight:1.5, margin:'0 0 0.3rem' }}>{lr.description}</p>
                      <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:600 }}>⏱ {lr.timeline}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Regulatory Risks ── */}
            <div>
              <h3 style={{ fontSize:'1.15rem', fontWeight:800, color:'var(--text-primary)', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                🚨 Regulatory Risks to Watch
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                {complianceData.risks.map((r, i) => (
                  <div key={i} style={{ background:severityBg(r.severity), border:`1px solid ${severityColor(r.severity)}30`, borderRadius:'var(--radius-lg)', padding:'1.25rem 1.5rem', borderLeft:`3px solid ${severityColor(r.severity)}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem' }}>
                      <span style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.97rem' }}>{r.issue}</span>
                      <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:'var(--radius-pill)', background:`${severityColor(r.severity)}18`, color:severityColor(r.severity), textTransform:'uppercase', letterSpacing:'0.06em' }}>
                        {r.severity} risk
                      </span>
                    </div>
                    <p style={{ color:'var(--text-secondary)', fontSize:'0.88rem', lineHeight:1.6, margin:'0 0 0.6rem' }}>{r.description}</p>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', background:'rgba(255,255,255,0.04)', borderRadius:'var(--radius-md)', padding:'0.6rem 0.85rem' }}>
                      <span style={{ color:severityColor(r.severity), fontSize:'0.8rem', fontWeight:700, flexShrink:0 }}>💡 Mitigation:</span>
                      <span style={{ color:'var(--text-secondary)', fontSize:'0.85rem', lineHeight:1.5 }}>{r.mitigation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CTA ── */}
            <div style={{ display:'flex', gap:'1rem', paddingTop:'0.5rem' }}>
              <button onClick={() => setAppState('investor_pitch')} className="btn-outline"
                style={{ padding:'0.75rem 1.25rem', fontWeight:600, display:'flex', alignItems:'center', gap:'0.5rem' }}>
                ← Back to Pitch
              </button>
              <button onClick={() => setAppState('report')} className="btn-solid btn-lg"
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem' }}>
                📊 View Full Report →
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER: REPORT — Post-Mortem
  // ─────────────────────────────────────────────────
  if (appState === 'report') {
    return (
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', animation:'slideUp 0.5s ease-out', paddingBottom:'4rem', position:'relative' }}>
        {renderProgress()}

        {/* ── SHARE MODAL OVERLAY ── */}
        {showShareModal && (
          <div style={{
            position:'fixed', inset:0, zIndex:999,
            background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:'1.5rem', animation:'fadeIn 0.25s ease-out'
          }}>
            <div style={{
              background:'var(--bg-base)', borderRadius:'1.5rem',
              padding:'2.5rem', maxWidth:520, width:'100%',
              border:'1px solid var(--border-light)', boxShadow:'0 24px 80px rgba(0,0,0,0.4)'
            }}>
              {posted ? (
                <div style={{ textAlign:'center', padding:'1rem 0' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🎉</div>
                  <h3 style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--text-primary)', marginBottom:'0.4rem' }}>Posted to Community!</h3>
                  <p style={{ color:'var(--text-secondary)', fontSize:'0.95rem' }}>Your journey is now visible on the community feed.</p>
                </div>
              ) : (
                <>
                  <div style={{ textAlign:'center', marginBottom:'1.75rem' }}>
                    <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🌐</div>
                    <h3 style={{ fontSize:'1.35rem', fontWeight:800, color:'var(--text-primary)', marginBottom:'0.4rem' }}>Share Your Journey?</h3>
                    <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem', lineHeight:1.6 }}>Post this simulation to the community feed so others can learn from your decisions. Completely optional.</p>
                  </div>

                  <div style={{ marginBottom:'1.5rem' }}>
                    <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.5rem' }}>Add a caption (optional)</label>
                    <textarea
                      value={shareCaption}
                      onChange={e => setShareCaption(e.target.value)}
                      placeholder="What did you learn? What would you do differently?"
                      style={{ width:'100%', minHeight:90, padding:'0.85rem 1rem', borderRadius:'var(--radius-md)', border:'1px solid var(--border-light)', background:'var(--bg-surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:'0.93rem', lineHeight:1.6, resize:'vertical', boxSizing:'border-box' }}
                    />
                  </div>

                  <div style={{ display:'flex', gap:'0.85rem' }}>
                    <button
                      onClick={() => setShowShareModal(false)}
                      className="btn-outline"
                      style={{ flex:1, padding:'0.8rem', fontWeight:600 }}
                    >
                      Skip
                    </button>
                    <button
                      onClick={handlePublishPost}
                      disabled={isPosting}
                      className="btn-solid"
                      style={{ flex:2, padding:'0.8rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}
                    >
                      {isPosting ? <div className="loader-white" style={{ width:18, height:18 }}/> : '🌐 Post to Community'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <ReportCard
          resources={resources}
          decisionLog={decisionLog}
          mvpFeatures={mvpFeatures}
          fundingDetails={fundingDetails}
        />
        <div style={{ marginTop: '3rem', maxWidth: 900, margin: '3rem auto 0 auto', width: '100%', display:'flex', gap:'1rem' }}>
          <button
            onClick={() => { setShowShareModal(true); setPosted(false); setShareCaption(''); }}
            className="btn-outline btn-lg"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', flex:1 }}
          >
            🌐 Share to Community
          </button>
          <button onClick={() => { setProblem(''); setSimulationId(''); setRound(1); setPersonas([]); setEvaluation(null); setDecisionLog([]); setResources({cash:80,impact:20,trust:50}); setShowShareModal(false); setPosted(false); setAppState('form'); }}
            className="btn-solid btn-lg" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', flex:1 }}>
            <RefreshCw size={16}/> {t('startNewSimulation')}
          </button>
        </div>
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
