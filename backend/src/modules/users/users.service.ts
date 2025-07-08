import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  UpdateUserDto,
  UpdatePreferencesDto,
  UserProfileDto,
  NotificationPreferencesDto,
  KeyboardShortcutsDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<{ users: UserProfileDto[]; total: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => this.mapUserToProfileDto(user)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

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

    // If email is being updated, check for conflicts
    if (email && email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
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

    // Update user preferences
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        notificationPreferences: updatedNotificationPreferences,
        keyboardShortcuts: updatedKeyboardShortcuts,
      },
    });

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
