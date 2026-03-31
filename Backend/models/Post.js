import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:  { type: String, required: true },
  text:      { type: String, required: true },
  rating:    { type: Number, min: 1, max: 5, default: null },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:         { type: String, required: true },
  simulationId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Simulation' },
  problemStatement: { type: String, required: true },
  caption:          { type: String, default: '' },

  // Simulation outcome snapshot
  score:            { type: Number, default: null },
  riskLabel:        { type: String, default: '' },
  survived:         { type: Boolean, default: false },
  finalCash:        { type: Number, default: 0 },
  finalImpact:      { type: Number, default: 0 },
  finalTrust:       { type: Number, default: 0 },
  decisionCount:    { type: Number, default: 0 },
  behavioralTags:   [{ type: String }],
  tacticalStance:   { type: String, default: '' },

  comments:  [CommentSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Post', PostSchema);
