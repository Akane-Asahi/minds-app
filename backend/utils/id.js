const mongoose = require('mongoose');

/**
 * Parse value to ObjectId. Returns null if invalid.
 */
function toObjectId(value) {
  try {
    return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
  } catch {
    return null;
  }
}

/**
 * Check if value is a valid ObjectId.
 */
function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

module.exports = {
  toObjectId,
  isValidObjectId
};
