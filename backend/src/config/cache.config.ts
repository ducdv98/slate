import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  // Default TTL in milliseconds
  ttl: parseInt(process.env.CACHE_TTL || '300', 10) * 1000,

  // Maximum number of items in memory cache
  max: parseInt(process.env.CACHE_MAX_ITEMS || '100', 10),

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'slate:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },

  // Cache strategies
  strategies: {
    // User sessions cache - longer TTL
    session: {
      ttl: parseInt(process.env.SESSION_CACHE_TTL || '1800', 10) * 1000, // 30 minutes
      max: 1000,
    },

    // API response cache - shorter TTL
    api: {
      ttl: parseInt(process.env.API_CACHE_TTL || '60', 10) * 1000, // 1 minute
      max: 500,
    },

    // Database query cache - medium TTL
    query: {
      ttl: parseInt(process.env.QUERY_CACHE_TTL || '300', 10) * 1000, // 5 minutes
      max: 200,
    },
  },
}));
