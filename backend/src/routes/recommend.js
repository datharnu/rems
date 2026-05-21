import express from 'express';
import { getRecommendations } from '../agents/recommendAgent.js';
import { getUserById } from '../utils/yelpLoader.js';

const router = express.Router();

// POST /api/recommend
// Body: { userHistory | userId, domain, followUp, conversationHistory }
router.post('/', async (req, res) => {
  try {
    const {
      userHistory,
      userId,
      domain,
      followUp,
      conversationHistory,
    } = req.body;

    let history = userHistory;
    if (!history && userId) {
      const user = getUserById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ error: `User ${userId} not found in dataset` });
      }
      history = { reviews: user.reviews || [] };
    }

    const result = await getRecommendations(history || { reviews: [] }, {
      domain: domain || 'restaurants',
      followUp,
      conversationHistory,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Recommend error:', err);
    res
      .status(err.status || 500)
      .json({ error: err.message, code: err.code });
  }
});

export default router;
