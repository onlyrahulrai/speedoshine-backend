import mongoose from 'mongoose';
import { imageTrackerPlugin } from '../helper/utils/imageTrackerPlugin';

mongoose.plugin(imageTrackerPlugin);

export const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('❌ MONGO_URI is not defined in .env file');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`.green.bold);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error}`.red.bold);
    process.exit(1); 
  }
};
