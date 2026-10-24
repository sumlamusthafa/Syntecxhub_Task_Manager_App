const mongoose = require("mongoose");

// Reuse one connection across requests (needed on serverless hosts like Vercel)
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI)
      .then((m) => m)
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
