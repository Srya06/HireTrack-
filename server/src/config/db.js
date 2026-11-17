import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isConnected = false;
let mongodInstance = null;

export const connectDB = async (uri = env.MONGODB_URI) => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // In test environment, use deterministic in-memory MongoMemoryServer with cached binary
  if (env.isTest) {
    if (!mongodInstance) {
      const cachedBinary = path.resolve(
        __dirname,
        '../../node_modules/.cache/mongodb-memory-server/mongod-x64-win32-8.2.6.exe'
      );
      process.env.MONGOMS_SYSTEM_BINARY = cachedBinary;
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
    console.error(`[Database] MongoDB Atlas connection failed: ${error.message}`);
    // In production, failure to connect to DB at startup is fatal
    if (env.isProduction) {
      process.exit(1);
    }

    // In development mode, if Atlas IP whitelist or network blocks, automatically fall back to cached in-memory MongoDB
    console.warn(
      '[Database] Falling back to automated in-memory MongoDB server for local development...'
    );

    try {
      if (!mongodInstance) {
        const cachedBinary = path.resolve(
          __dirname,
          '../../node_modules/.cache/mongodb-memory-server/mongod-x64-win32-8.2.6.exe'
        );
        process.env.MONGOMS_SYSTEM_BINARY = cachedBinary;
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
      }
      const memUri = mongodInstance.getUri();
      const conn = await mongoose.connect(memUri, {
        autoIndex: true
      });
      isConnected = true;
      console.log(`[Database] In-memory MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

      // Auto-populate demo dataset for instant local exploration
      try {
        const { seedDemo } = await import('../scripts/seedDemo.js');
        await seedDemo();
      } catch (seedErr) {
        console.warn('[Database] Auto-seeding skipped:', seedErr.message);
      }

      return conn.connection;
    } catch (fallbackErr) {
      console.error('[Database] In-memory fallback failed:', fallbackErr.message);
      return null;
    }
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
  // In test mode, keep the in-memory instance alive across test suites to prevent process thrashing
  if (!env.isTest && mongodInstance) {
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
