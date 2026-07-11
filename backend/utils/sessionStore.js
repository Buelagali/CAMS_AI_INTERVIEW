const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const SESSION_TTL = 7200;

let redisClient = null;
let useRedis = false;

function getRedisClient() {
  if (redisClient) return redisClient;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('Redis connection failed after 3 retries, falling back to in-memory store');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.warn('Redis error:', err.message);
      if (redisClient) {
        try { redisClient.disconnect(); } catch (e) { /* ignore */ }
        redisClient = null;
      }
      useRedis = false;
    });

    redisClient.on('connect', () => {
      useRedis = true;
      console.log('Redis connected');
    });

    return redisClient;
  } catch (err) {
    console.warn('Redis not available, using in-memory store:', err.message);
    useRedis = false;
    return null;
  }
}

const memoryStore = {};

function getStore() {
  return { redis: redisClient, memory: memoryStore };
}

async function initSessionStore() {
  try {
    const client = getRedisClient();
    if (client) {
      await client.connect();
      useRedis = true;
      console.log('Session store: Redis');
      return;
    }
  } catch {
    useRedis = false;
  }
  console.log('Session store: In-Memory');
}

async function createSession(sessionData) {
  const sessionId = uuidv4();
  const session = { ...sessionData, id: sessionId, createdAt: new Date() };

  if (useRedis && redisClient) {
    try {
      await redisClient.setex(
        `session:${sessionId}`,
        SESSION_TTL,
        JSON.stringify(session)
      );
      return session;
    } catch {
      useRedis = false;
    }
  }

  memoryStore[sessionId] = session;
  return session;
}

async function getSession(sessionId) {
  if (!sessionId) return null;

  if (useRedis && redisClient) {
    try {
      const data = await redisClient.get(`session:${sessionId}`);
      if (data) {
        await redisClient.expire(`session:${sessionId}`, SESSION_TTL);
        return JSON.parse(data);
      }
      return null;
    } catch {
      useRedis = false;
    }
  }

  return memoryStore[sessionId] || null;
}

async function updateSession(sessionId, updates) {
  if (!sessionId) return null;

  if (useRedis && redisClient) {
    try {
      const data = await redisClient.get(`session:${sessionId}`);
      if (data) {
        const session = JSON.parse(data);
        const updated = { ...session, ...updates };
        await redisClient.setex(`session:${sessionId}`, SESSION_TTL, JSON.stringify(updated));
        return updated;
      }
      return null;
    } catch {
      useRedis = false;
    }
  }

  if (memoryStore[sessionId]) {
    memoryStore[sessionId] = { ...memoryStore[sessionId], ...updates };
    return memoryStore[sessionId];
  }
  return null;
}

async function deleteSession(sessionId) {
  if (useRedis && redisClient) {
    try {
      await redisClient.del(`session:${sessionId}`);
      return;
    } catch {
      useRedis = false;
    }
  }

  delete memoryStore[sessionId];
}

function isRedisAvailable() {
  return useRedis;
}

module.exports = {
  initSessionStore,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  isRedisAvailable,
};
