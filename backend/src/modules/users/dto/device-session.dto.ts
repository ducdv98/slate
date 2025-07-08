import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';

export class DeviceSessionDto {
  @ApiProperty({
    description: 'Device session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Device type',
    enum: ['ios', 'android', 'web'],
    example: 'web',
  })
  deviceType: string;

  @ApiPropertyOptional({
    description: 'Device name',
    example: 'MacBook Pro',
  })
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'User agent string',
    example:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  })
  userAgent?: string;

  @ApiProperty({
    description: 'IP address',
    example: '192.168.1.100',
  })
  ipAddress: string;

  @ApiPropertyOptional({
    description: 'Location',
    example: 'San Francisco, CA',
  })
  location?: string;

  @ApiProperty({
    description: 'Whether the session is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Session creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last activity date',
    example: '2024-01-20T14:30:00Z',
  })
  lastActive: Date;

  @ApiPropertyOptional({
    description: 'Session expiration date',
    example: '2024-01-27T14:30:00Z',
  })
  expiresAt?: Date;
}

export class CreateDeviceSessionDto {
  @ApiProperty({
    description: 'Device type',
    enum: ['ios', 'android', 'web'],
    example: 'web',
  })
  @IsString()
  @IsIn(['ios', 'android', 'web'])
  deviceType: string;

  @ApiProperty({
    description: 'Device token/identifier',
    example: 'device_token_123456789',
  })
  @IsString()
  deviceToken: string;

  @ApiPropertyOptional({
    description: 'Device name',
    example: 'MacBook Pro',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'User agent string',
    example:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({
    description: 'IP address',
    example: '192.168.1.100',
  })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional({
    description: 'Location',
    example: 'San Francisco, CA',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Session expiration date',
    example: '2024-01-27T14:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateDeviceSessionDto {
  @ApiPropertyOptional({
    description: 'Device name',
    example: 'MacBook Pro - Work',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Whether the session is active',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Location',
    example: 'New York, NY',
  })
  @IsOptional()
  @IsString()
  location?: string;
}

export class DeviceSessionListDto {
  @ApiProperty({
    description: 'List of device sessions',
    type: [DeviceSessionDto],
  })
  sessions: DeviceSessionDto[];

  @ApiProperty({
    description: 'Total number of sessions',
    example: 5,
  })
  total: number;
}
