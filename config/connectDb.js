const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    // Log the MongoDB URI to ensure it's correctly loaded
    console.log('MONGODB_URL:', process.env.MONGODB_URL);

    // Make sure MONGO_URI is a valid string
    if (!process.env.MONGODB_URL) {
      throw new Error('MongoDB URL is missing from environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URL, {
      useUnifiedTopology: true,
      useFindAndModify: false, // Optional: if you're using `findOneAndUpdate`
    });

    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1); // Exit on error
  }
};

module.exports = connectDb;
