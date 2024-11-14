const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    // Log the MongoDB URI to ensure it's correctly loaded
    console.log('MONGO_URI:', process.env.MONGO_URI);

    // Make sure MONGO_URI is a valid string
    if (!process.env.MONGO_URI) {
      throw new Error('MongoDB URI is missing from environment variables');
    }

    await mongoose.connect(process.env.MONGO_URI, {
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
