# Environment Configuration Guide

This guide explains how to set up and manage environment variables for the Slate backend application.

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Update required variables:**
   - Set secure values for `JWT_SECRET` and `JWT_REFRESH_SECRET`
   - Configure your database connection in `DATABASE_URL`
   - Set up email credentials if using email features

3. **Generate secure secrets:**
   ```bash
   # Generate JWT secret
   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
   
   # Generate refresh token secret
   node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
   ```

## Environment Files

The application supports multiple environment-specific configuration files:

- `.env` - Main environment file (takes precedence)
- `.env.development` - Development-specific settings
- `.env.production` - Production-specific settings
- `.env.test` - Test environment settings
- `.env.example` - Template file with all available variables

### Loading Priority

Environment files are loaded in the following order (first found takes precedence):
1. `.env.${NODE_ENV}` (e.g., `.env.production`)
2. `.env`

## Required Variables

These variables must be set for the application to start:

### Database
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_REFRESH_SECRET` - Secret key for refresh token signing

## Optional Variables

### Application Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Application environment |
| `PORT` | `3000` | Server port |
| `APP_URL` | `http://localhost:3000` | Backend application URL |
| `FRONTEND_URL` | `http://localhost:4200` | Frontend application URL |
| `CORS_ORIGIN` | `http://localhost:4200` | CORS allowed origins |
| `LOG_LEVEL` | `debug` | Logging level (error, warn, info, debug, verbose) |

### Authentication & Security
| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_EXPIRES_IN` | `15m` | JWT token expiration time |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiration time |
| `BCRYPT_ROUNDS` | `12` | Password hashing rounds (4-15) |

### Database & Cache
| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `CACHE_TTL` | `300` | Default cache TTL in seconds |
| `CACHE_MAX_ITEMS` | `100` | Maximum items in memory cache |

### File Upload
| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_DIR` | `./uploads` | Directory for file uploads |
| `MAX_FILE_SIZE` | `10485760` | Maximum file size in bytes (10MB) |

### Email Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `MAIL_HOST` | - | SMTP server hostname |
| `MAIL_PORT` | `587` | SMTP server port |
| `MAIL_USER` | - | SMTP username |
| `MAIL_PASS` | - | SMTP password |
| `MAIL_FROM` | - | Default sender email |
| `MAIL_FROM_NAME` | `Slate` | Default sender name |
| `MAIL_SECURE` | `false` | Use SSL/TLS |

### Rate Limiting
| Variable | Default | Description |
|----------|---------|-------------|
| `THROTTLE_TTL` | `60` | Rate limit time window (seconds) |
| `THROTTLE_LIMIT` | `100` | Max requests per time window |
| `THROTTLE_SKIP_IPS` | - | Comma-separated IPs to skip rate limiting |

### Security & Features
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_SWAGGER` | `true` | Enable Swagger API documentation |
| `TRUST_PROXY` | `false` | Trust proxy headers (enable if behind load balancer) |

### External Services (Optional)
| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | - | AWS access key for S3 integration |
| `AWS_SECRET_ACCESS_KEY` | - | AWS secret key |
| `AWS_REGION` | - | AWS region |
| `AWS_S3_BUCKET` | - | S3 bucket name |
| `SENTRY_DSN` | - | Sentry error tracking DSN |
| `ANALYTICS_API_KEY` | - | Analytics service API key |

## Environment-Specific Configurations

### Development Environment

Development settings focus on developer experience:
- Relaxed rate limiting
- Debug logging enabled
- Swagger documentation enabled
- Fast password hashing (4 rounds)
- Local file storage

### Production Environment

Production settings prioritize security and performance:
- Strict rate limiting
- Warning-level logging only
- Swagger documentation disabled
- Secure password hashing (12 rounds)
- Proxy trust enabled for load balancers

### Test Environment

Test settings optimize for fast execution:
- Very fast password hashing (4 rounds)
- Error-only logging
- Separate test database
- Minimal cache TTL
- Disabled rate limiting

## Validation

All environment variables are validated at application startup using class-validator. The validation ensures:

- Required variables are present
- Numeric values are within acceptable ranges
- URL formats are valid
- Enum values match expected options

If validation fails, the application will not start and will display detailed error messages.

## Best Practices

### Security
1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for JWT tokens in production
3. **Rotate secrets regularly** in production environments
4. **Use environment-specific configurations** to avoid accidentally using development settings in production

### Performance
1. **Adjust cache TTL** based on your application's needs
2. **Configure appropriate rate limits** for your expected traffic
3. **Use Redis for caching** in production for better performance

### Monitoring
1. **Enable Sentry** in production for error tracking
2. **Use appropriate log levels** (warn/error in production, debug in development)
3. **Monitor rate limiting metrics** to adjust thresholds

## Troubleshooting

### Common Issues

1. **Application won't start - "Environment validation failed"**
   - Check that all required variables are set
   - Verify variable formats (URLs, numbers, etc.)
   - Review the validation error messages for specific issues

2. **Database connection errors**
   - Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
   - Ensure database server is running and accessible
   - Check network connectivity and firewall rules

3. **Email features not working**
   - Verify SMTP credentials and server settings
   - Check `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, and `MAIL_PASS`
   - Test SMTP connection manually

4. **Rate limiting too restrictive**
   - Adjust `THROTTLE_LIMIT` and `THROTTLE_TTL` values
   - Add trusted IPs to `THROTTLE_SKIP_IPS` if needed
   - Review endpoint-specific rate limits in the configuration

### Debug Commands

```bash
# Check current environment variables
printenv | grep -E "(NODE_ENV|DATABASE_URL|JWT_SECRET)"

# Test database connection
npm run prisma:status

# Validate environment configuration (if validation script exists)
npm run env:validate
``` 