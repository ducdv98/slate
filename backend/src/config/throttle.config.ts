import { registerAs } from '@nestjs/config';

export default registerAs('throttle', () => ({
  // Global rate limiting
  global: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10), // seconds
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10), // requests per TTL
  },

  // Endpoint-specific rate limiting
  endpoints: {
    // Authentication endpoints - stricter limits
    auth: {
      ttl: 900, // 15 minutes
      limit: 5, // 5 attempts per 15 minutes
    },

    // Password reset - very strict
    passwordReset: {
      ttl: 3600, // 1 hour
      limit: 3, // 3 attempts per hour
    },

    // Email verification - moderate
    emailVerification: {
      ttl: 300, // 5 minutes
      limit: 3, // 3 attempts per 5 minutes
    },

    // File upload - based on file size consideration
    upload: {
      ttl: 60, // 1 minute
      limit: 10, // 10 uploads per minute
    },

    // API endpoints - standard rate limiting
    api: {
      ttl: parseInt(process.env.API_THROTTLE_TTL || '60', 10),
      limit: parseInt(process.env.API_THROTTLE_LIMIT || '100', 10),
    },
  },

  // Skip throttling for specific IPs (e.g., health checks)
  skipIf: (request: { ip: string }) => {
    const skipIPs = process.env.THROTTLE_SKIP_IPS?.split(',') || [];
    return skipIPs.includes(request.ip);
  },
}));
