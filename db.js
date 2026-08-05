// db.js — MongoDB connection (via Mongoose)
//
// Call connectDB() once when the server starts (see server.js).
// Reads the connection string from MONGODB_URI in your .env file.

const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to your .env file, e.g.\n' +
      'MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/mataquest'
    );
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  await mongoose.connect(uri);
}

module.exports = { connectDB };