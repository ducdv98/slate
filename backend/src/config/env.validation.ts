import { Type, plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  Max,
  IsBoolean,
  validateSync,
  ValidationError,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Verbose = 'verbose',
}

export class EnvironmentVariables {
  // Application
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsUrl({ require_tld: false })
  @IsOptional()
  APP_URL: string = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:4200';

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:4200';

  @IsEnum(LogLevel)
  @IsOptional()
  LOG_LEVEL: LogLevel = LogLevel.Debug;

  // Database
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  // Authentication
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @Type(() => Number)
  @IsNumber()
  @Min(4)
  @Max(15)
  @IsOptional()
  BCRYPT_ROUNDS: number = 12;

  // File Upload
  @IsString()
  @IsOptional()
  UPLOAD_DIR: string = './uploads';

  @Type(() => Number)
  @IsNumber()
  @Min(1048576) // 1MB minimum
  @Max(104857600) // 100MB maximum
  @IsOptional()
  MAX_FILE_SIZE: number = 10485760; // 10MB default

  // Email Configuration
  @IsString()
  @IsOptional()
  MAIL_HOST: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  MAIL_PORT: number;

  @IsString()
  @IsOptional()
  MAIL_USER: string;

  @IsString()
  @IsOptional()
  MAIL_PASS: string;

  @IsEmail()
  @IsOptional()
  MAIL_FROM: string;

  @IsString()
  @IsOptional()
  MAIL_FROM_NAME: string = 'Slate';

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  MAIL_SECURE: boolean = false;

  // Rate Limiting
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_TTL: number = 60; // seconds

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT: number = 10; // requests per TTL

  // Cache Configuration
  @Type(() => Number)
  @IsNumber()
  @Min(60)
  @IsOptional()
  CACHE_TTL: number = 300; // 5 minutes default

  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @IsOptional()
  CACHE_MAX_ITEMS: number = 100;

  // Security
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  ENABLE_SWAGGER: boolean = true;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  TRUST_PROXY: boolean = false;

  // External Services (Optional for future integrations)
  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  AWS_REGION: string;

  @IsString()
  @IsOptional()
  AWS_S3_BUCKET: string;

  // Monitoring & Analytics
  @IsString()
  @IsOptional()
  SENTRY_DSN: string;

  @IsString()
  @IsOptional()
  ANALYTICS_API_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  // Pre-process the config to ensure proper types
  const processedConfig = { ...config };

  // Convert string numbers to actual numbers for validation
  if (processedConfig.PORT && typeof processedConfig.PORT === 'string') {
    const portNum = parseInt(processedConfig.PORT, 10);
    if (!isNaN(portNum)) {
      processedConfig.PORT = portNum;
    }
  }

  if (
    processedConfig.MAIL_PORT &&
    typeof processedConfig.MAIL_PORT === 'string'
  ) {
    const mailPortNum = parseInt(processedConfig.MAIL_PORT, 10);
    if (!isNaN(mailPortNum)) {
      processedConfig.MAIL_PORT = mailPortNum;
    }
  }

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    processedConfig,
    {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    skipUndefinedProperties: false,
    skipNullProperties: false,
    whitelist: false,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error: ValidationError) => {
        const constraints = Object.values(error.constraints || {});
        return `${error.property}: ${constraints.join(', ')}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  return validatedConfig;
}
