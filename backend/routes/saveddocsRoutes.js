const router = require('express').Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middleware/authMiddleware');
const {
  addSavedDoc,
  removeSavedDoc,
  getSavedDocByExternalId,
  saveQueryOnSearch,
  getQueryList,
  getCountsByWorkspace,
} = require('../controllers/saveddocsController');

// All saveddocs routes require authentication
router.use(authMiddleware);

// ---- toggle save/unsave (used by UI) --------------------------------------
router.post('/add', asyncHandler(addSavedDoc));
router.post('/remove', asyncHandler(removeSavedDoc));
router.get('/byExternalId/:externalId', asyncHandler(getSavedDocByExternalId));
router.post('/saveQueryOnSearch', asyncHandler(saveQueryOnSearch));
router.post('/querylist', asyncHandler(getQueryList));

// ---- counts used by workspace list badge ----------------------------------
router.post('/countsByWorkspace', asyncHandler(getCountsByWorkspace));

module.exports = router;
