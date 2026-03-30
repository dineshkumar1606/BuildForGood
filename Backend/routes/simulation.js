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

export default router;
