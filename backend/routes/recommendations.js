const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticateJWT, optionalAuthJWT } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validator');
const { rateLimit } = require('../middleware/rateLimiter');

// Get personalized recommendations for authenticated user
router.get(
  '/',
  authenticateJWT,
  validateRequest({
    query: {
      limit: 'number?',
      offset: 'number?',
      genres: 'string?',
      tags: 'string?',
      refresh: 'boolean?'
    }
  }),
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many recommendation requests, please try again later'
  }),
  recommendationController.getRecommendations
);

// Get trending manhwas (works for both authenticated and non-authenticated users)
router.get(
  '/trending',
  optionalAuthJWT, // Optional authentication
  validateRequest({
    query: {
      limit: 'number?',
      offset: 'number?'
    }
  }),
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many trending requests, please try again later'
  }),
  recommendationController.getTrending
);

// Additional routes can be added here:
// - Get recommendations by genre
// - Get recommendations similar to a specific manhwa
// - Get recommendations based on art style
// - etc.

module.exports = router; 