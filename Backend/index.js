import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import simulationRoutes from './routes/simulation.js';
import cofounderRoutes from './routes/cofounder.js';
import postRoutes from './routes/posts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/buildforgood';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: false
}));
app.use(express.json());

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();
    
    // Generate token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, bio: newUser.bio, location: newUser.location, title: newUser.title, skills: newUser.skills, linkedinUrl: newUser.linkedinUrl }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, bio: user.bio, location: user.location, title: user.title, skills: user.skills, linkedinUrl: user.linkedinUrl }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// User profile update route
app.put('/api/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });
    const tokenStr = authHeader.split(' ')[1];
    const decoded = jwt.verify(tokenStr, JWT_SECRET);

    const { name, email, bio, location, title, skills, linkedinUrl } = req.body;
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (title !== undefined) user.title = title;
    if (skills !== undefined) user.skills = skills;
    if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl;
    
    await user.save();

    // Generate new token with updated information
    const newToken = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Profile updated',
      token: newToken,
      user: { id: user._id, name: user.name, email: user.email, bio: user.bio, location: user.location, title: user.title, skills: user.skills, linkedinUrl: user.linkedinUrl }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

app.use('/api/simulation', simulationRoutes);
app.use('/api/cofounder', cofounderRoutes);
app.use('/api/posts', postRoutes);

app.get("/api/health",(req,res)=>{
  console.log("listening");
})
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
