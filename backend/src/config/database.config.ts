import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url:
    process.env.DATABASE_URL ||
    'postgresql://slate_user:slate_password@localhost:5432/slate_dev',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
}));
