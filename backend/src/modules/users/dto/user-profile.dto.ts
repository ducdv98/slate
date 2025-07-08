import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationPreferencesDto,
  KeyboardShortcutsDto,
} from './update-preferences.dto';

export class UserProfileDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  emailVerified: boolean;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/New_York',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Keyboard shortcuts configuration',
    type: KeyboardShortcutsDto,
  })
  keyboardShortcuts?: KeyboardShortcutsDto;

  @ApiPropertyOptional({
    description: 'Notification preferences',
    type: NotificationPreferencesDto,
  })
  notificationPreferences?: NotificationPreferencesDto;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Last login date',
    example: '2024-01-20T14:30:00Z',
  })
  lastLogin?: Date;
}
