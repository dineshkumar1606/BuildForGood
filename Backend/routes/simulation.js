import express from 'express';
import Groq from 'groq-sdk';
import Simulation from '../models/Simulation.js';
import auth from '../middleware/auth.js';

const router = express.Router();

function getGroq() {
  const apiKey = process.env.groq;
  if (!apiKey) throw new Error('groq is missing in .env');
  return new Groq({ apiKey });
}

function stripCodeFences(text) {
  let out = text.trim();
  if (out.startsWith('```json')) out = out.substring(7, out.length - 3).trim();
  else if (out.startsWith('```'))  out = out.substring(3, out.length - 3).trim();
  return out;
}

// ── GET All Projects ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const simulations = await Simulation.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .select('-personas.history -decisionLog');
    res.json(simulations);
  } catch {
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

// ── GET Specific Project ──────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const simulation = await Simulation.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!simulation) return res.status(404).json({ message: 'Project not found' });
    res.json(simulation);
  } catch {
    res.status(500).json({ message: 'Error fetching project' });
  }
});

// ── POST Save Draft (problem statement only) ─────────────────────────────────
router.post('/draft', auth, async (req, res) => {
  try {
    const { problemStatement, simulationId, budget } = req.body;
    let simulation;
    if (simulationId) {
      simulation = await Simulation.findOne({ _id: simulationId, userId: req.user.userId });
      if (simulation) {
        simulation.problemStatement = problemStatement;
        if (budget != null) {
          simulation.budget = budget;
          simulation.remainingBudget = budget;
        }
        simulation.updatedAt = Date.now();
      }
    }
    if (!simulation) {
      simulation = new Simulation({
        userId: req.user.userId,
        problemStatement,
        roundNumber: 1,
        personas: [],
        budget: budget || null,
        remainingBudget: budget || null
      });
    }
    await simulation.save();
    res.json(simulation);
  } catch (error) {
    console.error('Draft error:', error);
    res.status(500).json({ message: 'Error saving draft' });
  }
});

// ── POST Start Simulation → Groq generates Indian personas ───────────────────
router.post('/start', auth, async (req, res) => {
  try {
    const { problemStatement, simulationId, roundNumber, budget } = req.body;
    const groq = getGroq();
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const prompt = `You are a startup simulation engine set in India.
The founder's problem statement is: "${problemStatement}".
Generate exactly 3-4 unique personas of potential target users or community members based in India who might be affected by this problem.
All names must be authentic Indian names (Hindi/regional).
Output strictly as a JSON array. Each object must have:
"name" (string - Indian name), "age" (number), "occupation" (string - Indian context), "bio" (short 1-sentence description in Indian context), "personality" (brief hidden instruction for how this persona behaves in an interview).
Only output the raw JSON array. Do not wrap in markdown tags.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelName,
    });
    const generatedPersonas = JSON.parse(stripCodeFences(completion.choices[0].message.content));

    let simulation;
    if (simulationId) {
      simulation = await Simulation.findOne({ _id: simulationId, userId: req.user.userId });
      if (simulation) {
        simulation.problemStatement = problemStatement;
        simulation.roundNumber = roundNumber || (simulation.roundNumber + 1);
        simulation.personas = generatedPersonas.map(p => ({
          ...p,
          history: [{ role: 'model', content: `*You approach ${p.name}, a ${p.age}-year-old ${p.occupation}. They look open to talking.*` }]
        }));
        simulation.evaluation = null;
        simulation.operationalResources = { cash: 80, impact: 20, trust: 50 };
        simulation.decisionLog = [];
        simulation.operationalComplete = false;
        if (budget != null) { simulation.budget = budget; simulation.remainingBudget = budget; }
        simulation.updatedAt = Date.now();
      }
    }

    if (!simulation) {
      simulation = new Simulation({
        userId: req.user.userId,
        problemStatement,
        roundNumber: roundNumber || 1,
        budget: budget || null,
        remainingBudget: budget || null,
        personas: generatedPersonas.map(p => ({
          ...p,
          history: [{ role: 'model', content: `*Aap ${p.name} se milte hain, jo ${p.age} saal ke ${p.occupation} hain.*` }]
        }))
      });
    }

    await simulation.save();
    res.status(201).json(simulation);
  } catch (error) {
    console.error('Simulation start error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// ── POST Chat with Persona ────────────────────────────────────────────────────
router.post('/chat', auth, async (req, res) => {
  try {
    const { simulationId, personaId, message } = req.body;
    const simulation = await Simulation.findOne({ _id: simulationId, userId: req.user.userId });
    if (!simulation) return res.status(404).json({ message: 'Simulation not found' });

    const persona = simulation.personas.id(personaId);
    if (!persona) return res.status(404).json({ message: 'Persona not found' });

    const groq = getGroq();
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const systemPrompt = `You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation} living in India. Bio: ${persona.bio}. Personality: ${persona.personality}.
A startup founder is interviewing you about this problem: "${simulation.problemStatement}".
Keep responses very brief (1-3 sentences). Speak naturally in English. Stay in character. If the founder asks leading questions or makes assumptions, push back gently.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: 'Sure, you can ask me your questions.' },
      ...persona.history.slice(1).map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    persona.history.push({ role: 'user', content: message });

    const completion = await groq.chat.completions.create({ messages, model: modelName });
    const aiResponse = completion.choices[0].message.content;

    persona.history.push({ role: 'model', content: aiResponse });
    simulation.updatedAt = Date.now();
    await simulation.save();

    res.json({ response: aiResponse, history: persona.history });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// ── POST Evaluate Round ───────────────────────────────────────────────────────
router.post('/evaluate', auth, async (req, res) => {
  try {
    const { simulationId } = req.body;
    const simulation = await Simulation.findOne({ _id: simulationId, userId: req.user.userId });
    if (!simulation) return res.status(404).json({ message: 'Simulation not found' });

    const groq = getGroq();
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const transcripts = simulation.personas.map(p =>
      `\n--- Interview with ${p.name} (${p.occupation}) ---\n` +
      p.history.map(h => `${h.role}: ${h.content}`).join('\n')
    ).join('\n');

    const prompt = `You are an elite behavioral intelligence AI grading a founder's discovery interviews in the Indian social enterprise context.
Problem Statement: "${simulation.problemStatement}".

Transcripts:
${transcripts}

Evaluate the founder's ability to discover root causes without asking leading questions.
Output STRICTLY a JSON object with this shape:
{
  "score": <number 0-100>,
  "riskLabel": <"Excellent", "Good", "Aggressive", or "Poor">,
  "winRate": <string e.g. "45%">,
  "discipline": <string e.g. "80/100">,
  "behavioralTags": <array of 3-4 strings>,
  "tacticalStance": <2-3 sentences of harsh realistic feedback>
}
Do not wrap in markdown tags.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelName,
      response_format: { type: 'json_object' }
    });

    const parsedData = JSON.parse(stripCodeFences(completion.choices[0].message.content));
    simulation.evaluation = parsedData;
    simulation.updatedAt = Date.now();
    await simulation.save();

    res.json({ evaluation: parsedData });
  } catch (error) {
    console.error('Evaluate error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// ── POST Generate Operational Scenarios (India-contextualised, budget-aware) ─
router.post('/scenarios', auth, async (req, res) => {
  try {
    const { simulationId } = req.body;
    const simulation = await Simulation.findOne({ _id: simulationId, userId: req.user.userId });
    if (!simulation) return res.status(404).json({ message: 'Simulation not found' });

    const groq = getGroq();
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const budget = simulation.budget ? `₹${simulation.budget.toLocaleString('en-IN')}` : '₹5,00,000';

    const prompt = `You are an operational simulation engine for Indian social enterprises.
The founder's problem statement is: "${simulation.problemStatement}".
Their total operational budget is ${budget}.

Generate exactly 4 realistic, challenging operational scenarios that a social enterprise in India would face while solving this problem.
Each scenario must:
- Be grounded in real Indian context (government bureaucracy, local communities, NGO dynamics, rural/urban divide)
- Involve clear financial implications in Indian Rupees (₹)
- Have 3 choices with different risk-reward trade-offs that affect Cash Runway (%), Social Impact (%), and Community Trust (%)

Output STRICTLY as a JSON array of objects. Each object must have:
{
  "id": "s1" (string),
  "title": (string - short title),
  "description": (string - 2-3 sentences describing the real situation in Indian context, mention specific ₹ amounts),
  "choices": [
    {
      "id": "A",
      "label": (string - action label with ₹ cost/gain mentioned),
      "deltas": { "cash": <number -30 to +20>, "impact": <number -20 to +25>, "trust": <number -20 to +20> }
    }
  ]
}
Output only the raw JSON array. Do not wrap in markdown.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelName,
    });

    const scenarios = JSON.parse(stripCodeFences(completion.choices[0].message.content));

    // Reset operational state on the simulation for this fresh run
    simulation.operationalResources = { cash: 80, impact: 20, trust: 50 };
    simulation.remainingBudget = simulation.budget;
    simulation.decisionLog = [];
    simulation.operationalComplete = false;
    simulation.updatedAt = Date.now();
    await simulation.save();

    res.json({ scenarios });
  } catch (error) {
    console.error('Scenarios error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate scenarios' });
  }
});

// ── POST Save Operational Decision ───────────────────────────────────────────
router.post('/decision', auth, async (req, res) => {
  try {
    const { simulationId, scenarioId, choiceLabel, deltas, newResources, isComplete } = req.body;
    const simulation = await Simulation.findOne({ _id: simulationId, userId: req.user.userId });
    if (!simulation) return res.status(404).json({ message: 'Simulation not found' });

    // Calculate remaining budget proportional to cash gauge change
    if (simulation.budget && deltas.cash < 0) {
      const budgetDrop = Math.abs(deltas.cash / 100) * simulation.budget;
      simulation.remainingBudget = Math.max(0, (simulation.remainingBudget || simulation.budget) - budgetDrop);
    }

    simulation.decisionLog.push({ scenarioId, choiceLabel, deltas });
    simulation.operationalResources = newResources;
    simulation.operationalComplete = !!isComplete;
    simulation.updatedAt = Date.now();
    await simulation.save();

    res.json({ ok: true, remainingBudget: simulation.remainingBudget });
  } catch (error) {
    console.error('Decision error:', error);
    res.status(500).json({ message: 'Error saving decision' });
  }
});

// ── POST Generate Co-Founder Profiles (AI-powered, tier & qualification aware) ─
router.post('/cofounders', auth, async (req, res) => {
  try {
    const { simulationId, problemStatement, qualification, tier } = req.body;
    const groq = getGroq();
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const tierPriceGuide = {
      Newbie:       '₹5,000 – ₹15,000 per month',
      Amateur:      '₹20,000 – ₹50,000 per month',
      Professional: '₹60,000 – ₹1,50,000 per month'
    };

    const prompt = `You are a co-founder matching engine for Indian social enterprises.
A founder working on the problem: "${problemStatement}" is looking for a co-founder.

Requirements:
- Desired qualification / skill area: "${qualification || 'General management'}"
- Tier level: "${tier}" (${tierPriceGuide[tier] || tierPriceGuide['Amateur']})

Generate exactly 3 co-founder profiles that would be a great match.
All profiles must:
- Have authentic Indian names
- Match the "${tier}" experience level
- Have a realistic monthly price in Indian Rupees within the tier range
- Be relevant to the founder's problem domain

Output STRICTLY as a JSON array. Each object must have:
"name" (string - Indian name),
"qualification" (string - their actual qualification/degree),
"tier" (string - "${tier}"),
"specialty" (string - their area of expertise),
"price" (number - monthly price in ₹, must be within the tier range),
"rating" (number - rating out of 5 with one decimal, Newbie: 2.5-3.5, Amateur: 3.5-4.3, Professional: 4.3-5.0),
"bio" (string - 1-2 sentences about their background and why they fit this venture)

Output only the raw JSON array. Do not wrap in markdown.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelName,
    });

    const cofounders = JSON.parse(stripCodeFences(completion.choices[0].message.content));
    res.json({ cofounders });
  } catch (error) {
    console.error('Cofounders error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate co-founders' });
  }
});

// ── POST Save Progress State ─────────────────────────────────────────────────
router.post('/progress', auth, async (req, res) => {
  try {
    const { simulationId, coFounderSkipped, pitchComplete, fundingInvestor, fundingAmount, fundingEquity, mvpComplete, mvpFeatures } = req.body;
    const sim = await Simulation.findOne({ _id: simulationId, userId: req.user.userId });
    if (!sim) return res.status(404).json({ message: 'Simulation not found' });

    if (coFounderSkipped !== undefined) sim.coFounderSkipped = coFounderSkipped;
    if (pitchComplete !== undefined) sim.pitchComplete = pitchComplete;
    if (fundingInvestor !== undefined) sim.fundingInvestor = fundingInvestor;
    if (fundingAmount !== undefined) sim.fundingAmount = fundingAmount;
    if (fundingEquity !== undefined) sim.fundingEquity = fundingEquity;
    if (mvpComplete !== undefined) sim.mvpComplete = mvpComplete;
    if (mvpFeatures !== undefined) sim.mvpFeatures = mvpFeatures;
    
    sim.updatedAt = Date.now();
    await sim.save();

    res.json({ message: 'Progress saved' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// ── POST Generate Compliance & Policy Insights ────────────────────────────────
router.post('/compliance', auth, async (req, res) => {
  try {
    const { problemStatement } = req.body;
    if (!problemStatement?.trim()) return res.status(400).json({ message: 'Problem statement required' });

    const groq = getGroq();
    const prompt = `You are a legal and government compliance expert specializing in Indian social ventures and startups.

Based on the following founder's problem statement, generate a comprehensive compliance and policy guide.

Problem Statement: "${problemStatement}"

Return ONLY a valid JSON object with exactly this structure (no markdown, no extra text):
{
  "overview": "2-3 sentence regulatory landscape summary for this venture type",
  "schemes": [
    {
      "name": "Full official scheme name",
      "authority": "Ministry or body name",
      "inrBenefit": "Specific monetary benefit explicitly formatted in INR (e.g. '₹50,00,000 grant' or 'Up to ₹2 Crores tax relief')",
      "eligibility": "Who qualifies",
      "howToApply": "Brief application process"
    }
  ],
  "legalRequirements": [
    {
      "item": "Requirement name",
      "description": "What it involves",
      "priority": "mandatory",
      "timeline": "When to do this (e.g. Before launch / Within 30 days)"
    }
  ],
  "risks": [
    {
      "issue": "Regulatory risk title",
      "description": "Why this is a risk for this specific venture",
      "severity": "high",
      "mitigation": "How to address it"
    }
  ]
}

Rules:
- Include 3-5 schemes most relevant to the problem domain (healthcare/education/fintech/agriculture/climate/etc.)
- Include 4-6 legal requirements (registration, GST, FSSAI, data protection, etc. as relevant)
- Include 3-4 risks with severity: "high", "medium", or "low"
- priority must be exactly: "mandatory", "recommended", or "optional"
- Be specific to India and to the problem domain
- Return ONLY the JSON object`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 2000
    });

    const raw = completion.choices[0]?.message?.content || '';
    const cleaned = stripCodeFences(raw);
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ message: 'Failed to parse compliance data' });
    }

    res.json(result);
  } catch (error) {
    console.error('Compliance error:', error);
    res.status(500).json({ message: 'Error generating compliance insights' });
  }
});

export default router;

