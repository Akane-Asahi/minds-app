/**
 * Library Routes
 *
 * Proxy routes for Primo search and document details.
 * API keys are kept server-side; frontend never sees them.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  searchLibraryCatalogProxy,
  getDocumentDetailsProxy
} = require('../controllers/libraryController');

router.use(authMiddleware);

router.get('/search', searchLibraryCatalogProxy);
router.get('/details/:bibId', getDocumentDetailsProxy);

module.exports = router;
