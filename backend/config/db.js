const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri || String(uri).trim() === '') {
    console.error('MONGO_URI (or MONGODB_URI) is not defined. Set it in .env or environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.warn('MongoDB connected successfully');
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
