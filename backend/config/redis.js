const redis = require('redis');
const logger = require('./logger');

// Initialize Redis client
let client;

// Check if we have an environment variable for Redis, otherwise use a mock implementation
if (process.env.REDIS_URL) {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          // Exponential backoff for reconnection
          const delay = Math.min(retries * 50, 1000);
          logger.info(`Redis reconnecting after ${delay}ms`);
          return delay;
        }
      }
    });
    
    client.on('error', (err) => {
      logger.error(`Redis error: ${err}`);
    });
    
    client.on('connect', () => {
      logger.info('Connected to Redis');
    });
    
    client.on('reconnecting', () => {
      logger.info('Reconnecting to Redis');
    });
    
    client.connect().catch(err => {
      logger.error(`Failed to connect to Redis: ${err}`);
    });
    
  } catch (error) {
    logger.error(`Error initializing Redis: ${error}`);
    // Fall back to mock implementation
    client = createMockRedisClient();
  }
} else {
  logger.info('No REDIS_URL found, using in-memory mock implementation');
  client = createMockRedisClient();
}

/**
 * Create a simple in-memory mock Redis client for development
 * @returns {Object} Mock Redis client
 */
function createMockRedisClient() {
  const cache = {};
  const expirations = {};
  
  // Periodic cleanup of expired keys (every 30 seconds)
  setInterval(() => {
    const now = Date.now();
    Object.keys(expirations).forEach(key => {
      if (expirations[key] <= now) {
        delete cache[key];
        delete expirations[key];
      }
    });
  }, 30000);
  
  return {
    isConnected: true,
    isMock: true,
    
    // Simplified get method
    get: async (key) => {
      // Check if key exists and has not expired
      if (key in cache && (!expirations[key] || expirations[key] > Date.now())) {
        return cache[key];
      }
      return null;
    },
    
    // Simplified set method
    set: async (key, value, expiryMode, expire) => {
      cache[key] = value;
      
      // Handle expiration
      if (expiryMode === 'EX' && expire) {
        expirations[key] = Date.now() + (expire * 1000);
      }
      
      return 'OK';
    },
    
    // Delete a key
    del: async (key) => {
      const existed = key in cache;
      delete cache[key];
      delete expirations[key];
      return existed ? 1 : 0;
    },
    
    // Check if key exists
    exists: async (key) => {
      return (key in cache && (!expirations[key] || expirations[key] > Date.now())) ? 1 : 0;
    },
    
    // Set expiration
    expire: async (key, seconds) => {
      if (key in cache) {
        expirations[key] = Date.now() + (seconds * 1000);
        return 1;
      }
      return 0;
    },
    
    // Get remaining TTL
    ttl: async (key) => {
      if (!(key in cache)) return -2;
      if (!expirations[key]) return -1;
      
      const ttl = Math.ceil((expirations[key] - Date.now()) / 1000);
      return ttl > 0 ? ttl : -2;
    },
    
    // Clear all data (for testing)
    flushAll: async () => {
      Object.keys(cache).forEach(key => {
        delete cache[key];
        delete expirations[key];
      });
      return 'OK';
    }
  };
}

module.exports = client; 