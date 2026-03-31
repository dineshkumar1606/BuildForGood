import { useState, useMemo } from 'react';
import { Zap, Clock, IndianRupee, ArrowRight, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface MVPFeature {
  id: string;
  name: string;
  description: string;
  cost: number;
  buildTime: number; // in days
  impactScore: number;
}

const DOMAINS: Record<string, Omit<MVPFeature, 'id'>[]> = {
  education: [
    { name: 'Offline Course Player', description: 'Download lectures to watch without internet.', cost: 8000, buildTime: 7, impactScore: 9 },
    { name: 'Doubt Forum', description: 'Community Q&A for students.', cost: 5000, buildTime: 4, impactScore: 6 },
    { name: 'Automated Quizzes', description: 'Self-grading tests for instant feedback.', cost: 6000, buildTime: 5, impactScore: 7 },
    { name: 'AI Tutor Chatbot', description: 'Basic AI answering common syllabus questions.', cost: 12000, buildTime: 12, impactScore: 8 },
    { name: 'Regional Lang Audio', description: 'Voiceovers in local languages.', cost: 9000, buildTime: 8, impactScore: 9 },
    { name: 'Guardian SMS Updates', description: 'Weekly progress reports sent to parents.', cost: 3000, buildTime: 2, impactScore: 5 },
    { name: 'Gamification Badges', description: 'Reward system to increase completion rates.', cost: 4000, buildTime: 4, impactScore: 4 },
    { name: 'Homework Submission', description: 'Portal to upload assignments.', cost: 7000, buildTime: 6, impactScore: 7 },
    { name: 'Certificate Generator', description: 'Auto-generates PDFs upon course completion.', cost: 3000, buildTime: 3, impactScore: 3 },
    { name: 'Live Streaming', description: 'Infrastructure to host live weekend classes.', cost: 11000, buildTime: 10, impactScore: 8 },
    { name: 'Analytics Dashboard', description: 'Track student watch time and dropout rates.', cost: 6000, buildTime: 5, impactScore: 6 },
    { name: 'Career Board', description: 'Basic job listings for graduates.', cost: 4000, buildTime: 4, impactScore: 5 },
  ],
  health: [
    { name: 'Telemedicine Booking', description: 'Schedule video calls with remote doctors.', cost: 10000, buildTime: 8, impactScore: 9 },
    { name: 'E-Prescriptions', description: 'Digital PDF prescriptions sent via WhatsApp.', cost: 5000, buildTime: 4, impactScore: 8 },
    { name: 'Nearby Clinic Map', description: 'Geolocation for closest healthcare centers.', cost: 6000, buildTime: 5, impactScore: 7 },
    { name: 'Symptom Checker AI', description: 'Basic triage questionnaire before booking.', cost: 12000, buildTime: 12, impactScore: 6 },
    { name: 'Offline Patient Records', description: 'Local storage caching for rural clinics.', cost: 9000, buildTime: 10, impactScore: 10 },
    { name: 'Diet Tracker', description: 'Log meals for nutritional advice.', cost: 4000, buildTime: 4, impactScore: 3 },
    { name: 'Pill Reminder SMS', description: 'Automated daily dosage reminders.', cost: 3000, buildTime: 2, impactScore: 8 },
    { name: 'Multilingual UI', description: 'Interface available in 5 regional languages.', cost: 7000, buildTime: 6, impactScore: 7 },
    { name: 'Blood Donation Registry', description: 'Database matching donors to recipients.', cost: 8000, buildTime: 7, impactScore: 8 },
    { name: 'Insurance Claim Portal', description: 'Direct API integration with Ayushman Bharat.', cost: 11000, buildTime: 14, impactScore: 9 },
    { name: 'Mental Health Helpline', description: 'Anonymous SOS 1-click calling.', cost: 4000, buildTime: 3, impactScore: 8 },
    { name: 'IoT Vitals Sync', description: 'Bluetooth integration with pulse oximeters.', cost: 12000, buildTime: 12, impactScore: 5 },
  ],
  environment: [
    { name: 'Carbon Footprint Calc', description: 'Calculate daily CO2 emissions for users.', cost: 6000, buildTime: 5, impactScore: 6 },
    { name: 'Waste Pickup Scheduling', description: 'Uber-like tracking for garbage collection.', cost: 10000, buildTime: 10, impactScore: 9 },
    { name: 'Eco-Rewards Store', description: 'Redeem points for sustainable products.', cost: 8000, buildTime: 7, impactScore: 7 },
    { name: 'Nearby Recycling Map', description: 'Find e-waste and plastic drop-off points.', cost: 5000, buildTime: 4, impactScore: 8 },
    { name: 'Energy Usage Tracker', description: 'Manual input logging for electricity bills.', cost: 4000, buildTime: 3, impactScore: 4 },
    { name: 'Tree Planting Ledger', description: 'Geo-tagged photos of planted saplings.', cost: 7000, buildTime: 6, impactScore: 6 },
    { name: 'Solar Panel ROI Calc', description: 'Tool for households to estimate savings.', cost: 5000, buildTime: 4, impactScore: 7 },
    { name: 'Offline Reporting', description: 'Log illegal dumping without internet.', cost: 9000, buildTime: 8, impactScore: 8 },
    { name: 'Policy Alert SMS', description: 'Updates on local environmental regulations.', cost: 2000, buildTime: 2, impactScore: 4 },
    { name: 'Water Quality Map', description: 'Crowdsourced reports on drinking water.', cost: 6000, buildTime: 5, impactScore: 8 },
    { name: 'Community Cleanup Forum', description: 'Organize local weekend drives.', cost: 4000, buildTime: 4, impactScore: 6 },
    { name: 'IoT Air Quality Sync', description: 'Live AQI readings from cheap sensors.', cost: 11000, buildTime: 12, impactScore: 7 },
  ],
  livelihood: [
    { name: 'Crop Yield Predictor', description: 'Basic weather-based forecast for farmers.', cost: 8000, buildTime: 7, impactScore: 8 },
    { name: 'Microloan Application', description: 'Paperless loan processing portal.', cost: 12000, buildTime: 12, impactScore: 10 },
    { name: 'Local APMC Prices', description: 'Daily SMS updates on mandi crop rates.', cost: 3000, buildTime: 2, impactScore: 9 },
    { name: 'Direct DBT Sync', description: 'Track government subsidy transfers.', cost: 10000, buildTime: 10, impactScore: 8 },
    { name: 'Skill Training Videos', description: 'Offline-first vocational training modules.', cost: 9000, buildTime: 8, impactScore: 7 },
    { name: 'Regional Job Board', description: 'Blue-collar listings in local language.', cost: 7000, buildTime: 6, impactScore: 8 },
    { name: 'SHG Ledger', description: 'Digital accounting for Self Help Groups.', cost: 6000, buildTime: 5, impactScore: 7 },
    { name: 'Offline Marketplace', description: 'Peer-to-peer selling in rural clusters.', cost: 11000, buildTime: 12, impactScore: 9 },
    { name: 'Mentor Matching', description: 'Connect rural MSMEs with urban experts.', cost: 5000, buildTime: 4, impactScore: 5 },
    { name: 'Voice-based Nav', description: 'UI navigation for illiterate users.', cost: 10000, buildTime: 9, impactScore: 9 },
    { name: 'Equipment Rental Portal', description: 'Uber for tractors and heavy machinery.', cost: 9000, buildTime: 8, impactScore: 8 },
    { name: 'Supply Chain Tracker', description: 'QR codes to trace produce origin.', cost: 12000, buildTime: 10, impactScore: 6 },
  ],
  women_safety: [
    { name: 'SOS Panic Button', description: 'Hardware volume-button trigger.', cost: 9000, buildTime: 7, impactScore: 10 },
    { name: 'Fake Call Audio', description: 'Simulate an incoming call to escape situations.', cost: 3000, buildTime: 2, impactScore: 6 },
    { name: 'Trusted Contacts Sync', description: 'Auto-share live location with 5 people.', cost: 6000, buildTime: 5, impactScore: 9 },
    { name: 'Safe Route Map', description: 'Crowdsourced data on well-lit streets.', cost: 11000, buildTime: 10, impactScore: 9 },
    { name: 'Legal Rights Library', description: 'Offline summaries of domestic violence laws.', cost: 4000, buildTime: 3, impactScore: 5 },
    { name: 'Offline Support Helplines', description: 'Directory of NGOs and shelters.', cost: 2000, buildTime: 2, impactScore: 8 },
    { name: 'Anonymous Reporting', description: 'Upload evidence directly to secure servers.', cost: 10000, buildTime: 9, impactScore: 8 },
    { name: 'Community Forum', description: 'Safe, verified-only discussion board.', cost: 8000, buildTime: 7, impactScore: 7 },
    { name: 'Self Defense Videos', description: 'Curated offline video modules.', cost: 5000, buildTime: 4, impactScore: 4 },
    { name: 'Police Station Locator', description: 'One tap route to the nearest precinct.', cost: 4000, buildTime: 3, impactScore: 6 },
    { name: 'Ride Tracking', description: 'Verify cab/auto numbers securely.', cost: 7000, buildTime: 6, impactScore: 8 },
    { name: 'Safety Score Audits', description: 'Users rate neighborhoods for safety.', cost: 8000, buildTime: 7, impactScore: 7 },
  ],
};

function mapDomainString(domainState: string) {
  const d = domainState.toLowerCase();
  if (d.includes('edu')) return 'education';
  if (d.includes('health') || d.includes('medic')) return 'health';
  if (d.includes('enviro') || d.includes('climate') || d.includes('waste')) return 'environment';
  if (d.includes('safe') || d.includes('women')) return 'women_safety';
  return 'livelihood'; // default fallback for agri/finance/social impact
}

interface MVPBuilderProps {
  availableBudget: number;
  domain: string;
  onComplete: (selectedFeatures: MVPFeature[]) => void;
}

export default function MVPBuilder({ availableBudget, domain, onComplete }: MVPBuilderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Build the complete list of 12 features based on the domain input
  const features = useMemo<MVPFeature[]>(() => {
    const key = mapDomainString(domain);
    const list = DOMAINS[key] || DOMAINS['livelihood'];
    return list.map((f, i) => ({ ...f, id: `${key}-${i}` }));
  }, [domain]);

  const toggleFeature = (f: MVPFeature) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(f.id)) {
      newSet.delete(f.id);
    } else {
      if (newSet.size >= 5) return; // Constraint: Max 5 features
      newSet.add(f.id);
    }
    setSelectedIds(newSet);
  };

  const selectedFeatures = features.filter(f => selectedIds.has(f.id));
  const totalCost = selectedFeatures.reduce((sum, f) => sum + f.cost, 0);
  const totalTime = selectedFeatures.reduce((sum, f) => sum + f.buildTime, 0); 
  const launchReadiness = selectedFeatures.reduce((sum, f) => sum + f.impactScore, 0);
  const remainingBudget = availableBudget - totalCost;

  // Warning Constraints
  const TECH_BUDGET_LIMIT = availableBudget;
  const TIME_LIMIT = 45;

  const isBudgetWarning = totalCost > TECH_BUDGET_LIMIT;
  const isTimeWarning = totalTime > TIME_LIMIT;

  // Semantic CSS Variables mapped conceptually without hardcoded hex
  const colorSuccessBase = 'var(--text-success, #10b981)';
  const colorSuccessBg = 'var(--bg-success, rgba(16,185,129,0.1))';
  
  const colorDangerBase = 'var(--text-danger, #ef4444)';
  const colorDangerBg = 'var(--bg-danger, rgba(239,68,68,0.1))';
  
  const colorWarningBase = 'var(--text-warning, #f59e0b)';
  const colorWarningBg = 'var(--bg-warning, rgba(245,158,11,0.1))';

  const colorInfoBase = 'var(--text-info, #3b82f6)';
  const colorInfoBg = 'var(--bg-info, rgba(59,130,246,0.1))';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>MVP Builder</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 650, margin: '0 auto' }}>
          Select up to <strong>5 core features</strong> to build your MVP. Balance cost, time, and impact carefully. Investors will interrogate you on what you prioritized based on your `{domain}` domain.
        </p>
      </div>

      {/* Constraints Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Cost / Budget Tracker */}
        <div style={{ 
          background: isBudgetWarning ? colorDangerBg : 'var(--bg-base)', 
          border: `1px solid ${isBudgetWarning ? colorDangerBase : 'var(--border-light)'}`, 
          borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center', transition: 'all 0.2s' 
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TOTAL COST</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isBudgetWarning ? colorDangerBase : 'var(--text-primary)' }}>
            ₹{totalCost.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>
             {isBudgetWarning ? <><AlertTriangle size={10} style={{display:'inline'}}/> Exceeds target!</> : <>Target: ₹{TECH_BUDGET_LIMIT.toLocaleString('en-IN')}</>}
          </div>
        </div>

        {/* Feature Count Tracker */}
        <div style={{ 
          background: selectedIds.size === 5 ? colorSuccessBg : 'var(--bg-base)', 
          border: `1px solid ${selectedIds.size === 5 ? colorSuccessBase : 'var(--border-light)'}`, 
          borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center', transition: 'all 0.2s' 
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>FEATURES (MAX 5)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedIds.size === 5 ? colorSuccessBase : 'var(--text-primary)' }}>
            {selectedIds.size} / 5
          </div>
        </div>

        {/* Time Tracker */}
        <div style={{ 
          background: isTimeWarning ? colorWarningBg : 'var(--bg-base)', 
          border: `1px solid ${isTimeWarning ? colorWarningBase : 'var(--border-light)'}`, 
          borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center', transition: 'all 0.2s' 
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TOTAL BUILD TIME</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isTimeWarning ? colorWarningBase : 'var(--text-primary)' }}>
            {totalTime} days
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>
             {isTimeWarning ? <><AlertTriangle size={10} style={{display:'inline'}}/> Go-to-market delayed!</> : <>Target: &lt; {TIME_LIMIT} days</>}
          </div>
        </div>

        {/* Score Tracker */}
        <div style={{ background: colorInfoBg, border: `1px solid ${colorInfoBase}`, borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: colorInfoBase, opacity: 0.8, marginBottom: '0.25rem' }}>LAUNCH READINESS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: colorInfoBase }}>
            {launchReadiness}/50
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {features.map(f => {
          const isSelected = selectedIds.has(f.id);
          const maxReached = selectedIds.size >= 5 && !isSelected;
          const insufficientFunds = remainingBudget - (isSelected ? 0 : f.cost) < 0; // Check real hard budget
          const isDisabled = maxReached || insufficientFunds;

          // Compute dynamic styles purely based on state to avoid hardcoded blue/green limits on the raw cards
          const cardBg = isSelected ? colorSuccessBg : 'var(--bg-base)';
          const cardBorder = isSelected ? colorSuccessBase : 'var(--border-light)';
          
          return (
            <div key={f.id} 
              onClick={() => { if (!isDisabled) toggleFeature(f); }}
              style={{
                background: cardBg,
                border: `2px solid ${cardBorder}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{f.name}</h3>
                {isSelected ? <CheckCircle2 size={20} style={{ color: colorSuccessBase }} /> : 
                 (insufficientFunds ? <ShieldAlert size={20} style={{ color: colorDangerBase }} /> : 
                 <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-light)' }} />)}
              </div>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5, minHeight: '40px' }}>
                {f.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <IndianRupee size={12} /> {f.cost.toLocaleString('en-IN')}
                </span>
                <span style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Clock size={12} /> {f.buildTime}d
                </span>
                <span style={{ background: colorInfoBg, color: colorInfoBase, border: `1px solid ${colorInfoBase}`, opacity: 0.9, padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Zap size={12} /> +{f.impactScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '2rem', paddingBottom: '2rem' }}>
        <button 
          onClick={() => onComplete(selectedFeatures)}
          disabled={selectedIds.size === 0}
          className="btn-solid btn-lg" 
          style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
        >
          Finalize MVP & Enter Market <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
        </button>
      </div>

    </div>
  );
}
