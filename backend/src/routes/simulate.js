import express from 'express';
import { simulateReview } from '../agents/reviewAgent.js';
import { getUserById, listUsers } from '../utils/yelpLoader.js';

const router = express.Router();

// GET /api/simulate/users
// Returns sample users available in the Yelp dataset (useful for the UI dropdown)
router.get('/users', (req, res) => {
  res.json({ users: listUsers() });
});

// POST /api/simulate
// Body:
//   { userHistory: { reviews: [...] }, itemDetails: { name, category, description, location } }
// OR
//   { userId: "<id from dataset>", itemDetails: { ... } }
router.post('/', async (req, res) => {
  try {
    const { userHistory, userId, itemDetails } = req.body;

    if (!itemDetails?.name || !itemDetails?.category) {
      return res.status(400).json({
        error: 'itemDetails.name and itemDetails.category are required',
      });
    }

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

    const result = await simulateReview(
      history || { reviews: [] },
      itemDetails
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Simulate error:', err);
    res
      .status(err.status || 500)
      .json({ error: err.message, code: err.code });
  }
});

export default router;
