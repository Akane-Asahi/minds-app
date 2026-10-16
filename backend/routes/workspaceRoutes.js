// backend/routes/workspaceRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
  createWorkspace,
  fetchAllWorkspaces,
  fetchWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} = require('../controllers/workspaceController');

// All workspace routes require authentication
router.use(authMiddleware);

// Disable caching for authenticated workspace endpoints (prevents 304 reusing previous user's data)
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Vary", "Authorization");
  next();
});

// Canonical REST
router.get('/', fetchAllWorkspaces);
router.post('/', createWorkspace);
// @deprecated alias - remove after frontend migration
router.get('/allworkspace', (req, res, next) => {
  res.set('X-Deprecated-Route', 'true');
  res.set('X-Canonical-Route', 'GET /api/workspaces');
  next();
}, fetchAllWorkspaces);
// @deprecated alias - remove after frontend migration
router.get('/:workspaceId/workspace', (req, res, next) => {
  res.set('X-Deprecated-Route', 'true');
  res.set('X-Canonical-Route', 'GET /api/workspaces/:workspaceId');
  next();
}, fetchWorkspaceById);
// @deprecated alias - remove after frontend migration
router.put('/:workspaceId/workspace', (req, res, next) => {
  res.set('X-Deprecated-Route', 'true');
  res.set('X-Canonical-Route', 'PUT /api/workspaces/:workspaceId');
  next();
}, updateWorkspace);
// @deprecated alias - remove after frontend migration
router.delete('/:workspaceId/workspace', (req, res, next) => {
  res.set('X-Deprecated-Route', 'true');
  res.set('X-Canonical-Route', 'DELETE /api/workspaces/:workspaceId');
  next();
}, deleteWorkspace);
// Canonical by-id
router.get('/:workspaceId', fetchWorkspaceById);
router.put('/:workspaceId', updateWorkspace);
router.delete('/:workspaceId', deleteWorkspace);

module.exports = router;