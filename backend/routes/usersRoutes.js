/**
 * User Routes - Participant-only auth
 *
 * - POST /api/users/participant-login - Participant login (find or create)
 * - GET  /api/users/me - Get current user (requires auth)
 */

const express = require('express');
const router = express.Router();
const { participantLogin, getCurrentUser } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/participant-login', participantLogin);

router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
