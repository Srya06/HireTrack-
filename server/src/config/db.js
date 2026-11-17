import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;
let mongodInstance = null;

export const connectDB = async (uri = env.MONGODB_URI) => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // In test environment, attempt connection; if external cluster fails or has IP restrictions, fallback to MongoMemoryServer
  if (env.isTest) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
        autoIndex: true
      });
      isConnected = true;
      return conn.connection;
    } catch {
      if (!mongodInstance) {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
      }
      const memUri = mongodInstance.getUri();
      const conn = await mongoose.connect(memUri, {
        autoIndex: true
      });
      isConnected = true;
      return conn.connection;
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    if (!env.isTest) {
      console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    }

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      if (!env.isTest) {
        console.warn('[Database] MongoDB disconnected.');
      }
    });

    return conn.connection;
  } catch (error) {
    console.error(`[Database] MongoDB connection failed: ${error.message}`);
    // In production, failure to connect to DB at startup is fatal
    if (env.isProduction) {
      process.exit(1);
    }
    return null;
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
};

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'unknown',
    code: stateCode,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
};
