import { applyDecorators } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsDateString,
  IsUrl,
  IsInt,
  Min,
  Max,
  ValidationOptions,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Common string validation
export function IsRequiredString(
  minLength = 1,
  maxLength = 255,
  options?: { swagger?: any; validation?: ValidationOptions },
) {
  return applyDecorators(
    IsString(options?.validation),
    IsNotEmpty(options?.validation),
    MinLength(minLength, options?.validation),
    MaxLength(maxLength, options?.validation),
    ApiProperty({
      type: 'string',
      minLength,
      maxLength,
      ...options?.swagger,
    }),
  );
}

// Optional string validation
export function IsOptionalString(
  minLength = 1,
  maxLength = 255,
  options?: { swagger?: any; validation?: ValidationOptions },
) {
  return applyDecorators(
    IsOptional(options?.validation),
    IsString(options?.validation),
    MinLength(minLength, options?.validation),
    MaxLength(maxLength, options?.validation),
    ApiPropertyOptional({
      type: 'string',
      minLength,
      maxLength,
      ...options?.swagger,
    }),
  );
}

// Email validation
export function IsRequiredEmail(options?: {
  swagger?: any;
  validation?: ValidationOptions;
}) {
  return applyDecorators(
    IsEmail({}, options?.validation),
    IsNotEmpty(options?.validation),
    Transform(({ value }: { value: string }) =>
      typeof value === 'string' ? value.toLowerCase().trim() : value,
    ),
    ApiProperty({
      type: 'string',
      format: 'email',
      example: 'user@example.com',
      ...options?.swagger,
    }),
  );
}

// UUID validation
export function IsRequiredUUID(options?: {
  swagger?: any;
  validation?: ValidationOptions;
}) {
  return applyDecorators(
    IsUUID('4', options?.validation),
    IsNotEmpty(options?.validation),
    ApiProperty({
      type: 'string',
      format: 'uuid',
      example: '123e4567-e89b-12d3-a456-426614174000',
      ...options?.swagger,
    }),
  );
}

// Enum validation
export function IsRequiredEnum<T extends Record<string, any>>(
  enumObject: T,
  options?: { swagger?: any; validation?: ValidationOptions },
) {
  return applyDecorators(
    IsEnum(enumObject, options?.validation),
    IsNotEmpty(options?.validation),
    ApiProperty({
      enum: Object.values(enumObject),
      example: Object.values(enumObject)[0],
      ...options?.swagger,
    }),
  );
}

// Optional enum validation
export function IsOptionalEnum<T extends Record<string, any>>(
  enumObject: T,
  options?: { swagger?: any; validation?: ValidationOptions },
) {
  return applyDecorators(
    IsOptional(options?.validation),
    IsEnum(enumObject, options?.validation),
    ApiPropertyOptional({
      enum: Object.values(enumObject),
      example: Object.values(enumObject)[0],
      ...options?.swagger,
    }),
  );
}

// Date validation
export function IsRequiredDate(options?: {
  swagger?: any;
  validation?: ValidationOptions;
}) {
  return applyDecorators(
    IsDateString({}, options?.validation),
    IsNotEmpty(options?.validation),
    ApiProperty({
      type: 'string',
      format: 'date-time',
      example: '2024-01-01T00:00:00Z',
      ...options?.swagger,
    }),
  );
}

// URL validation
export function IsOptionalUrl(options?: {
  swagger?: any;
  validation?: ValidationOptions;
}) {
  return applyDecorators(
    IsOptional(options?.validation),
    IsUrl({}, options?.validation),
    ApiPropertyOptional({
      type: 'string',
      format: 'url',
      example: 'https://example.com',
      ...options?.swagger,
    }),
  );
}

// Integer range validation
export function IsRequiredIntRange(
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  options?: { swagger?: any; validation?: ValidationOptions },
) {
  return applyDecorators(
    IsInt(options?.validation),
    Min(min, options?.validation),
    Max(max, options?.validation),
    ApiProperty({
      type: 'integer',
      minimum: min,
      maximum: max,
      example: min,
      ...options?.swagger,
    }),
  );
}

// Optional integer range validation
export function IsOptionalIntRange(
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  options?: { swagger?: any; validation?: ValidationOptions },
) {
  return applyDecorators(
    IsOptional(options?.validation),
    IsInt(options?.validation),
    Min(min, options?.validation),
    Max(max, options?.validation),
    ApiPropertyOptional({
      type: 'integer',
      minimum: min,
      maximum: max,
      example: min,
      ...options?.swagger,
    }),
  );
}
