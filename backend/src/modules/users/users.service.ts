import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import {
  UpdateUserDto,
  UpdatePreferencesDto,
  UserProfileDto,
  NotificationPreferencesDto,
  KeyboardShortcutsDto,
} from './dto';
import { AuditAction } from '../../shared/types/audit.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findOne(id: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToProfileDto(user);
  }

  async findByEmail(email: string): Promise<UserProfileDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapUserToProfileDto(user) : null;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    const { name, email, avatarUrl, timezone } = updateUserDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Track changes for audit logging
    const changes: Record<string, { before?: any; after?: any }> = {};

    // If email is being updated, check for conflicts
    if (email && email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
      changes.email = { before: existingUser.email, after: email };
    }

    // Track other changes
    if (name && name !== existingUser.name) {
      changes.name = { before: existingUser.name, after: name };
    }
    if (avatarUrl !== undefined && avatarUrl !== existingUser.avatarUrl) {
      changes.avatarUrl = { before: existingUser.avatarUrl, after: avatarUrl };
    }
    if (timezone && timezone !== existingUser.timezone) {
      changes.timezone = { before: existingUser.timezone, after: timezone };
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email, emailVerified: false }), // Reset verification if email changes
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(timezone && { timezone }),
      },
    });

    // Log profile update if there were changes
    if (Object.keys(changes).length > 0) {
      await this.auditLogService.logUserAction(
        AuditAction.USER_PROFILE_UPDATE,
        id,
        id,
        changes,
      );
    }

    return this.mapUserToProfileDto(updatedUser);
  }

  async updatePreferences(
    id: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<UserProfileDto> {
    const { notificationPreferences, keyboardShortcuts } = updatePreferencesDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Track changes for audit logging
    const changes: Record<string, { before?: any; after?: any }> = {};

    // Merge preferences with existing ones
    const updatedNotificationPreferences = notificationPreferences
      ? {
          ...((existingUser.notificationPreferences as object) || {}),
          ...notificationPreferences,
        }
      : existingUser.notificationPreferences;

    const updatedKeyboardShortcuts = keyboardShortcuts
      ? {
          ...((existingUser.keyboardShortcuts as object) || {}),
          ...keyboardShortcuts,
        }
      : existingUser.keyboardShortcuts;

    // Track preference changes
    if (notificationPreferences) {
      changes.notificationPreferences = {
        before: existingUser.notificationPreferences,
        after: updatedNotificationPreferences,
      };
    }
    if (keyboardShortcuts) {
      changes.keyboardShortcuts = {
        before: existingUser.keyboardShortcuts,
        after: updatedKeyboardShortcuts,
      };
    }

    // Update user preferences
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        notificationPreferences: updatedNotificationPreferences,
        keyboardShortcuts: updatedKeyboardShortcuts,
      },
    });

    // Log preference update if there were changes
    if (Object.keys(changes).length > 0) {
      await this.auditLogService.logUserAction(
        AuditAction.USER_PROFILE_UPDATE,
        id,
        id,
        changes,
      );
    }

    return this.mapUserToProfileDto(updatedUser);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  private mapUserToProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl || undefined,
      timezone: user.timezone || undefined,
      keyboardShortcuts:
        (user.keyboardShortcuts as KeyboardShortcutsDto) || undefined,
      notificationPreferences:
        (user.notificationPreferences as NotificationPreferencesDto) ||
        undefined,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || undefined,
    };
  }
}
