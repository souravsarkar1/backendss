import dns from "node:dns";
import mongoose from "mongoose";

import { env } from "./env.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};
