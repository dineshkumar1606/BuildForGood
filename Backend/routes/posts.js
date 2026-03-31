import express from 'express';
import Post from '../models/Post.js';
import Simulation from '../models/Simulation.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// ── GET All Public Posts (community feed) ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    res.json(posts);
  } catch {
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

// ── GET My Reviews (comments on my posts) ────────────────────────────────────
router.get('/me/reviews', auth, async (req, res) => {
  try {
    const userPosts = await Post.find({ userId: req.user.userId }).lean();
    let reviews = [];
    for (const post of userPosts) {
      for (const comment of post.comments) {
        if (comment.userId.toString() !== req.user.userId.toString()) {
          reviews.push({
            ...comment,
            postId: post._id,
            postProblem: post.problemStatement,
          });
        }
      }
    }
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(reviews);
  } catch {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// ── POST Publish a simulation as a community post ────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { simulationId, caption } = req.body;
    const simulation = await Simulation.findOne({ _id: simulationId, userId: req.user.userId });
    if (!simulation) return res.status(404).json({ message: 'Simulation not found' });

    const post = new Post({
      userId:           req.user.userId,
      userName:         req.user.name,
      simulationId:     simulation._id,
      problemStatement: simulation.problemStatement,
      caption:          caption || '',
      score:            simulation.evaluation?.score ?? null,
      riskLabel:        simulation.evaluation?.riskLabel ?? '',
      survived:         (simulation.operationalResources?.cash ?? 0) > 0,
      finalCash:        simulation.operationalResources?.cash ?? 0,
      finalImpact:      simulation.operationalResources?.impact ?? 0,
      finalTrust:       simulation.operationalResources?.trust ?? 0,
      decisionCount:    simulation.decisionLog?.length ?? 0,
      behavioralTags:   simulation.evaluation?.behavioralTags ?? [],
      tacticalStance:   simulation.evaluation?.tacticalStance ?? '',
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error('Post error:', err);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// ── POST Add a comment to a post ─────────────────────────────────────────────
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { text, rating } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text is required' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({
      userId:   req.user.userId,
      userName: req.user.name,
      text:     text.trim(),
      rating:   typeof rating === 'number' ? Math.max(1, Math.min(5, rating)) : null
    });
    await post.save();
    res.json(post);
  } catch {
    res.status(500).json({ message: 'Error adding comment' });
  }
});

export default router;
