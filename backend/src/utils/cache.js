const redis = require('redis');
const logger = require('./logger');

let redisClient = null;

/**
 * Initialize Redis client
 */
const initRedis = async () => {
  try {
    if (process.env.REDIS_URL) {
      redisClient = redis.createClient({
        url: process.env.REDIS_URL
      });

      redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      redisClient.on('connect', () => {
        logger.info('Redis Client Connected');
      });

      await redisClient.connect();
    } else {
      logger.warn('Redis URL not provided, caching disabled');
    }
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    redisClient = null;
  }
};

/**
 * Get value from cache
 */
const get = async (key) => {
  if (!redisClient) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

/**
 * Set value in cache
 */
const set = async (key, value, expirationInSeconds = 3600) => {
  if (!redisClient) return false;

  try {
    await redisClient.setEx(key, expirationInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete value from cache
 */
const del = async (key) => {
  if (!redisClient) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete multiple keys matching pattern
 */
const delPattern = async (pattern) => {
  if (!redisClient) return false;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error(`Cache delete pattern error for ${pattern}:`, error);
    return false;
  }
};

/**
 * Clear all cache
 */
const flush = async () => {
  if (!redisClient) return false;

  try {
    await redisClient.flushAll();
    return true;
  } catch (error) {
    logger.error('Cache flush error:', error);
    return false;
  }
};

/**
 * Close Redis connection
 */
const close = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

module.exports = {
  initRedis,
  get,
  set,
  del,
  delPattern,
  flush,
  close
};


