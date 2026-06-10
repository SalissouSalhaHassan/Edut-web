import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let isRedisConnected = false;

const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: 1, // Don't block forever
  connectTimeout: 5000,   // Fail fast
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
  isRedisConnected = true;
});

redis.on('error', (err) => {
  // Only log in production or if explicitly requested to avoid noise in dev
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Redis Connection Error:', err.message);
  }
  isRedisConnected = false;
});

// Local in-memory fallback cache
const memoryCache = new Map<string, { value: any; expiry: number }>();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (isRedisConnected) {
      try {
        const data = await redis.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
      } catch (e) {
        // Fallback to memory on error
      }
    }
    
    const cached = memoryCache.get(key);
    if (cached) {
      if (Date.now() < cached.expiry) {
        return cached.value as T;
      }
      memoryCache.delete(key);
    }
    return null;
  },

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (isRedisConnected) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (e) {
        // Fallback to memory on error
      }
    }
    
    memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  },

  async del(key: string): Promise<void> {
    if (isRedisConnected) {
      try {
        await redis.del(key);
      } catch (e) {}
    }
    memoryCache.delete(key);
  },

  async flush(): Promise<void> {
    if (isRedisConnected) {
      try {
        await redis.flushall();
      } catch (e) {}
    }
    memoryCache.clear();
  }
};

export default redis;
