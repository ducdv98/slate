import { IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsOptional()
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Enable in-app notifications',
    example: true,
  })
  @IsOptional()
  inApp?: boolean;

  @ApiPropertyOptional({
    description: 'Enable mention notifications',
    example: true,
  })
  @IsOptional()
  mentions?: boolean;

  @ApiPropertyOptional({
    description: 'Enable assignment notifications',
    example: true,
  })
  @IsOptional()
  assignments?: boolean;

  @ApiPropertyOptional({
    description: 'Enable status change notifications',
    example: true,
  })
  @IsOptional()
  statusChanges?: boolean;
}

export class KeyboardShortcutsDto {
  @ApiPropertyOptional({
    description: 'Quick add issue shortcut',
    example: 'cmd+i',
  })
  @IsOptional()
  quickAdd?: string;

  @ApiPropertyOptional({
    description: 'Search shortcut',
    example: 'cmd+k',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Navigate to projects shortcut',
    example: 'g p',
  })
  @IsOptional()
  goToProjects?: string;

  @ApiPropertyOptional({
    description: 'Navigate to issues shortcut',
    example: 'g i',
  })
  @IsOptional()
  goToIssues?: string;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Notification preferences',
    type: NotificationPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;

  @ApiPropertyOptional({
    description: 'Keyboard shortcuts configuration',
    type: KeyboardShortcutsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => KeyboardShortcutsDto)
  keyboardShortcuts?: KeyboardShortcutsDto;
}
