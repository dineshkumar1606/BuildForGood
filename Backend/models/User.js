import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  title: { type: String, default: '' },
  skills: [{ type: String }],
  linkedinUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
