import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
  content: { type: String, required: true }
});

const PersonaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  occupation: { type: String, required: true },
  bio: { type: String, required: true },
  personality: { type: String, required: true },
  history: [MessageSchema]
});

const EvaluationSchema = new mongoose.Schema({
  score: { type: Number, default: null },
  riskLabel: { type: String, default: 'Aggressive' },
  winRate: { type: String, default: '0%' },
  discipline: { type: String, default: '0/100' },
  behavioralTags: [{ type: String }],
  tacticalStance: { type: String, default: '' }
});

// Stores each scenario decision for replay / persistence
const DecisionLogSchema = new mongoose.Schema({
  scenarioId: { type: String },
  choiceLabel: { type: String },
  deltas: {
    cash: { type: Number },
    impact: { type: Number },
    trust: { type: Number }
  }
});

const SimulationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemStatement: { type: String, required: true },
  roundNumber: { type: Number, default: 1 },
  personas: [PersonaSchema],
  evaluation: { type: EvaluationSchema, default: null },

  // Budget & Operational Phase persistence
  budget: { type: Number, default: null },            // Founder-supplied budget in ₹
  remainingBudget: { type: Number, default: null },   // Tracks current remaining ₹ after decisions
  operationalResources: {                             // Last known gauge state
    cash:   { type: Number, default: 80 },
    impact: { type: Number, default: 20 },
    trust:  { type: Number, default: 50 }
  },
  decisionLog: [DecisionLogSchema],                   // All decisions made
  operationalComplete: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Simulation', SimulationSchema);
