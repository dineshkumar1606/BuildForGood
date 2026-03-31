import { useState } from 'react';
import { Landmark, FileText, Brain } from 'lucide-react';

export interface FundingOffer {
  investorName: string;
  amount: string;
  equity: string;
}

interface InvestorPitchProps {
  onComplete: (offer: FundingOffer | null) => void;
  problemStatement: string;
}

type InvestorId = 'meera' | 'rajan' | 'sunita';

const INVESTOR_NAMES: Record<InvestorId, string[]> = {
  meera: ['Meera Iyer', 'Aisha Khan', 'Priya Patel', 'Kavita Singh', 'Anita Desai', 'Neha Reddy'],
  rajan: ['Rajan Mehta', 'Vikram Kumar', 'Sanjay Gupta', 'Arjun Reddy', 'Karan Malhotra', 'Rahul Sharma'],
  sunita: ['Sunita Rao', 'Lakshmi Sharma', 'Nandini Joshi', 'Geeta Verma', 'Smriti Das', 'Pooja Iyer']
};

const INVESTORS = {
  meera: {
    id: 'meera',
    name: 'Meera Iyer',
    role: 'Angel investor',
    tag: 'Community-first',
    icon: '👩',
    color: '#10b981',
    psychology: 'Meera cares about real human impact. She hates corporate jargon and overselling. She wants to know that you understand the root cause of the problem and the community you are serving.',
  },
  rajan: {
    id: 'rajan',
    name: 'Rajan Mehta',
    role: 'VC partner',
    tag: 'ROI-focused',
    icon: '👨',
    color: '#f59e0b',
    psychology: 'Rajan is all about unit economics, scale, and data. He will test your confidence and facts. He expects crisp numbers and rational market sizes. Avoid emotional pitches.',
  },
  sunita: {
    id: 'sunita',
    name: 'Sunita Rao',
    role: 'Government grant officer',
    tag: 'Scale & safety',
    icon: '👩‍💼',
    color: '#8b5cf6',
    psychology: 'Sunita manages public funds. She is risk-averse, looks for compliance, and wants solutions that map to existing government schemes or broad public infrastructure targets.',
  }
};

const ROUNDS = [
  {
    title: 'Round 1: The First 30 Seconds',
    context: '"What do you do?"',
    lesson: 'Most founders lead with features instead of the problem or vision. Investors fund big problems, not just tools. Feel the difference between feature-led vs problem-led.',
    options: {
      meera: [
        { text: 'We built an app that connects communities to resources using an AI matching algorithm.', isCorrect: false },
        { text: `We saw that [Problem] ruins lives daily. We are stopping it at the source.`, isCorrect: true },
        { text: 'We are raising ₹5 Crores to monopolize the social space.', isCorrect: false }
      ],
      rajan: [
        { text: 'We have a really cool platform with 15 unique features to solve this problem.', isCorrect: false },
        { text: `The market for [Problem] loses ₹10,000 Crores annually to inefficiency. We built the fix.`, isCorrect: true },
        { text: 'We want to make the world a better place through technology.', isCorrect: false }
      ],
      sunita: [
        { text: 'Our app is better than any government alternative.', isCorrect: false },
        { text: `National goals mandate solving [Problem]. We created a scalable tool to bridge that gap.`, isCorrect: true },
        { text: 'We built a blockchain solution for this.', isCorrect: false }
      ]
    }
  },
  {
    title: 'Round 2: Defensive Dishonesty',
    context: '"How do you know this will actually work? Where is the data?"',
    lesson: 'Founders often oversell or shut down when they don\'t know. Honesty about what you don\'t know builds more trust than a polished deflection.',
    options: {
      meera: [
        { text: 'Everyone we spoke to said they absolutely love it.', isCorrect: false },
        { text: 'We are still proving out the long-term retention, but early pilots with 50 families showed a 40% reduction in the core issue.', isCorrect: true },
        { text: 'We don\'t have full data yet.', isCorrect: false }
      ],
      rajan: [
        { text: 'Our projections show capturing 50% of the market in year 1.', isCorrect: false },
        { text: 'We don\'t have LTV data yet because it\'s too early, but our initial CAC is ₹400, which beats the industry average.', isCorrect: true },
        { text: 'We are focusing on product right now, not numbers.', isCorrect: false }
      ],
      sunita: [
        { text: 'Our tech is 100% foolproof and guaranteed to work.', isCorrect: false },
        { text: 'We are running a sandbox pilot to establish the baseline metrics before rolling out statewide.', isCorrect: true },
        { text: 'If you fund us, we will figure it out.', isCorrect: false }
      ]
    }
  },
  {
    title: 'Round 3: Negotiation Mechanics',
    context: '"What valuation are you looking for?"',
    lesson: 'Never ask the investor what works for them. Always anchor the negotiation by putting a specific number on the table first, with a rationale attached.',
    options: {
      meera: [
        { text: 'What do you think is fair?', isCorrect: false },
        { text: 'We are raising ₹2.5 Crores on a ₹20 Crores post-money cap, based on the capital needed to reach our next 1,000 community members.', isCorrect: true },
        { text: 'We want a ₹100 Crores valuation because that\'s what standard tech startups get.', isCorrect: false }
      ],
      rajan: [
        { text: 'We are waiting for a lead investor to price it.', isCorrect: false },
        { text: 'Raising ₹5 Crores on a ₹40 Crores cap. It gives us 18 months of runway to hit ₹50 Lakh MRR, which justifies a Series A.', isCorrect: true },
        { text: 'We are raising ₹10 Crores on a ₹200 Crores cap.', isCorrect: false }
      ],
      sunita: [
        { text: 'We just need whatever grant amount you can spare.', isCorrect: false },
        { text: 'We are applying for the Tier-2 grant of ₹50 Lakh, mapped exactly to our Phase 1 operational expansion budget.', isCorrect: true },
        { text: 'We want ₹5 Crores.', isCorrect: false }
      ]
    }
  },
  {
    title: 'Round 4: Holding the Boundary',
    context: 'The investor offers the money, but adds: "I want to pivot the core audience to corporate clients instead of the community you mentioned."',
    lesson: 'Knowing when to say NO respectfully is harder than saying yes. An investor who forces a pivot off your mission is a dangerous partner.',
    options: {
      meera: [
        { text: 'Yes, we can absolutely do that if you fund us.', isCorrect: false },
        { text: 'We appreciate that angle, but our core mission is the community. We are open to corporate later, but the community comes first.', isCorrect: true },
        { text: 'No, that\'s a stupid idea.', isCorrect: false }
      ],
      rajan: [
        { text: 'Sure, corporate pays more. Let\'s pivot.', isCorrect: false },
        { text: 'Corporate is a lucrative Phase 2. But we must capture the initial wedge market first to build the data moat you and I both want.', isCorrect: true },
        { text: 'We are not changing our plan.', isCorrect: false }
      ],
      sunita: [
        { text: 'We will change our entire charter to fit your requirement.', isCorrect: false },
        { text: 'That pivot would violate our current non-profit charter, but we can structure a parallel program if additional mandates arise later.', isCorrect: true },
        { text: 'We don\'t take orders from the government.', isCorrect: false }
      ]
    }
  }
];

export default function InvestorPitch({ onComplete, problemStatement }: InvestorPitchProps) {
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorId | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [responses, setResponses] = useState<boolean[]>([]);
  const [showOffer, setShowOffer] = useState(false);
  const [declinedInvestors, setDeclinedInvestors] = useState<InvestorId[]>([]);
  const [activeTab, setActiveTab] = useState<'deck' | 'terms' | 'psychology'>('psychology');
  const [investorBatch, setInvestorBatch] = useState(0);

  // Dynamically derive the current names based on the batch index
  const currentInvestors = Object.keys(INVESTORS).reduce((acc, key) => {
    const k = key as InvestorId;
    const names = INVESTOR_NAMES[k];
    acc[k] = { ...INVESTORS[k], name: names[investorBatch % names.length] };
    return acc;
  }, {} as Record<InvestorId, typeof INVESTORS[InvestorId]>);

  if (!selectedInvestor) {
    // If all investors are exhausted
    if (declinedInvestors.length >= Object.keys(INVESTORS).length) {
      return (
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌐</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Network Exhausted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            You have pitched to everyone in your current network. You can tap into the broader regional network to find new investors with similar profiles, or proceed unfunded.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => onComplete(null)} className="btn-outline">
              Proceed Unfunded
            </button>
            <button onClick={() => { setDeclinedInvestors([]); setInvestorBatch(b => b + 1); }} className="btn-solid" style={{ background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>
              Find New Investors ↺
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Choose your investor</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Each investor has a different style and agenda. Your tactics need to adapt. This is Round 6 of The Founder's Road — you've built the company. Now you fund it.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {(Object.keys(currentInvestors) as InvestorId[]).map(key => {
            const inv = currentInvestors[key];
            const isExhausted = declinedInvestors.includes(key);
            return (
              <button key={key} onClick={() => !isExhausted && setSelectedInvestor(key)}
                disabled={isExhausted}
                style={{
                  background: isExhausted ? 'var(--bg-surface)' : 'var(--bg-base)', border: `1.5px solid ${isExhausted ? 'var(--border-light)' : 'var(--border-light)'}`, borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem 1rem', cursor: isExhausted ? 'not-allowed' : 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.2s', opacity: isExhausted ? 0.5 : 1
                }}
                onMouseEnter={e => { if (!isExhausted) (e.currentTarget as HTMLElement).style.borderColor = inv.color; }}
                onMouseLeave={e => { if (!isExhausted) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', filter: isExhausted ? 'grayscale(1)' : 'none' }}>{inv.icon}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{inv.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{inv.role}</div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', background: isExhausted ? 'var(--border-light)' : `${inv.color}15`, color: isExhausted ? 'var(--text-muted)' : inv.color }}>
                  {isExhausted ? 'Passed' : inv.tag}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    );
  }

  const investor = currentInvestors[selectedInvestor];

  const handleOptionClick = (isCorrect: boolean) => {
    const newResponses = [...responses, isCorrect];
    setResponses(newResponses);

    if (roundIdx < ROUNDS.length - 1) {
      setRoundIdx(r => r + 1);
    } else {
      setShowOffer(true);
    }
  };

  const handleTryAnother = () => {
    setDeclinedInvestors(prev => [...prev, selectedInvestor]);
    setSelectedInvestor(null);
    setRoundIdx(0);
    setResponses([]);
    setShowOffer(false);
  };

  const score = responses.filter(r => r).length;

  if (showOffer) {
    let offerContent;
    
    if (score === 4) {
      offerContent = {
        title: 'Strong Offer',
        msg: `"${investor.name} is extremely impressed. You hit every psychological trigger perfectly."`,
        offerText: '₹5 Crores for 15% equity',
        amount: '₹5 Crores',
        equity: '15%',
        success: true
      };
    } else if (score === 3) {
      offerContent = {
        title: 'Lowball Offer',
        msg: `"${investor.name} sees potential but thinks you still have some blind spots. They are hedging their risk."`,
        offerText: '₹3 Crores for 25% equity',
        amount: '₹3 Crores',
        equity: '25%',
        success: true
      };
    } else {
      offerContent = {
        title: 'Investor Passed',
        msg: `"${investor.name} did not feel aligned. You misread their priorities and failed to anchor the conversation."`,
        offerText: 'No offer.',
        success: false
      };
    }

    return (
      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
        <div style={{ background: 'var(--bg-base)', border: `2px solid ${offerContent.success ? investor.color : 'var(--border-light)'}`, borderRadius: 'var(--radius-lg)', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{investor.icon}</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{offerContent.title}</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
            {offerContent.msg}
          </p>
          
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontSize: '1.2rem', fontWeight: 800, color: offerContent.success ? investor.color : 'var(--text-muted)' }}>
            {offerContent.offerText}
          </div>

          {offerContent.success ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleTryAnother} className="btn-outline" style={{ flex: 1, padding: '0.85rem' }}>
                Decline Offer
              </button>
              <button onClick={() => onComplete({ investorName: investor.name, amount: offerContent.amount!, equity: offerContent.equity! })} className="btn-solid" style={{ flex: 1, padding: '0.85rem', background: '#10b981', borderColor: '#10b981' }}>
                Accept Offer ✅
              </button>
            </div>
          ) : (
            <button onClick={handleTryAnother} className="btn-solid" style={{ width: '100%', padding: '0.85rem' }}>
              Try Another Investor →
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentRound = ROUNDS[roundIdx];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem' }}>{investor.icon}</div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Meeting with {investor.name}</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{investor.role} · {investor.tag}</div>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>ROUND {roundIdx + 1} OF 4</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
            {currentRound.title}
          </div>
          <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5, marginBottom: '1rem' }}>
            {currentRound.context.replace('[Problem]', problemStatement.substring(0, 30) + '...')}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentRound.options[selectedInvestor].map((opt, i) => (
            <button key={i} onClick={() => handleOptionClick(opt.isCorrect)}
              style={{
                textAlign: 'left', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
                background: 'var(--bg-base)', color: 'var(--text-primary)', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-base)'; }}>
              {opt.text.replace('[Problem]', problemStatement.substring(0, 30) + '...')}
            </button>
          ))}
        </div>
      </div>

      {/* Tool panel at the bottom */}
      <div style={{ marginTop: '2.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
          {[
            { id: 'psychology', icon: Brain, label: 'Investor Psychology' },
            { id: 'deck', icon: FileText, label: 'Pitch Deck' },
            { id: 'terms', icon: Landmark, label: 'Term Tracker' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: activeTab === tab.id ? 'var(--bg-base)' : 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '1.25rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, minHeight: '80px' }}>
          {activeTab === 'psychology' && (
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>{investor.name}'s Profile:</strong> {investor.psychology}
            </div>
          )}
          {activeTab === 'deck' && (
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Your Pre-set Numbers:</strong><br />
              Don't make up numbers on the fly. You need ₹5 Crores to reach the next milestone (100k users / ₹50 Lakh MRR).
            </div>
          )}
          {activeTab === 'terms' && (
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Your Walk-Away Point:</strong><br />
              Do NOT accept less than ₹2 Crores, and do NOT give up more than 20% equity. Do NOT pivot off your core problem statement.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

