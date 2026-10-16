// Participant-only authentication. Legacy auth removed.

const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

const AUTH_API_DEBUG = process.env.AUTH_DEBUG === 'true';

const sanitizeUserResponse = (user) => ({
  _id: user._id,
  username: user.participantId || (user.username ? user.username.replace(/^p_/, '') : null),
  participantId: user.participantId || (user.username ? user.username.replace(/^p_/, '') : null)
});

/**
 * Participant-only login (idempotent): find or create user by participantId, return JWT.
 * @route   POST /api/users/participant-login
 * @access  Public
 */
const participantLogin = asyncHandler(async (req, res) => {
  const pid = String(req.body?.participantId ?? '').trim();

  if (!pid) return res.status(400).json({ error: 'Participant ID required' });

  const internalUsername = `p_${pid}`;
  let created = false;
  let user = await User.findOne({ username: internalUsername });

  if (!user) {
    user = await User.findOne({ participantId: pid });
    if (user) {
      user.username = internalUsername;
      await user.save();
    }
  }

  if (!user) {
    try {
      user = await User.create({ username: internalUsername, participantId: pid });
      created = true;
    } catch (err) {
      if (err?.code === 11000) {
        user = await User.findOne({ username: internalUsername });
        if (!user) {
          await new Promise((r) => setTimeout(r, 50));
          user = await User.findOne({ username: internalUsername });
        }
      }
      if (!user) {
        return res.status(500).json({ error: 'Server error' });
      }
    }
  }

  const token = generateToken(user._id);
  const displayPid = user.participantId || user.username?.replace(/^p_/, '') || pid;

  console.warn(
    `[Auth API] participant-login participantId=${displayPid} userId=${user._id} created=${created}`
  );

  return res.status(200).json({
    token,
    userId: user._id,
    participantId: displayPid
  });
});

/**
 * Get current user
 * @route   GET /api/users/me
 * @access  Private (requires authMiddleware)
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(401).json({ error: 'User not found or session invalid', code: 'UNAUTHORIZED' });
  }

  return res.status(200).json(sanitizeUserResponse(user));
});

module.exports = {
  participantLogin,
  getCurrentUser
};
