const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Remove the deprecated option
      useUnifiedTopology: true,  // This should remain as it's still useful
      useFindAndModify: false,   // Optional: If you're using `findOneAndUpdate`, it's recommended to set it to `false`
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1); // Exit on error
  }
};

module.exports = connectDb;
