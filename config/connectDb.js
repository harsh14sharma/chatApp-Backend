const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    const uri = process.env.MONGODB_URL;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in the environment variables");
    }
    await mongoose.connect(uri, {
      // useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDb;
