import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceSession, DeviceType } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import {
  CreateDeviceSessionDto,
  UpdateDeviceSessionDto,
  DeviceSessionDto,
  DeviceSessionListDto,
} from './dto';
import { AuditAction } from '../../shared/types/audit.types';

@Injectable()
export class DeviceSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createOrUpdateSession(
    userId: string,
    sessionData: CreateDeviceSessionDto,
  ): Promise<DeviceSessionDto> {
    const { deviceToken, deviceType, ...otherData } = sessionData;

    // Try to find existing session by userId and deviceToken
    const existingSession = await this.prisma.deviceSession.findUnique({
      where: {
        userId_deviceToken: {
          userId,
          deviceToken,
        },
      },
    });

    if (existingSession) {
      // Update existing session
      const updatedSession = await this.prisma.deviceSession.update({
        where: { id: existingSession.id },
        data: {
          ...otherData,
          lastActive: new Date(),
          isActive: true,
        },
      });

      // Log session update
      await this.auditLogService.logUserAction(
        AuditAction.SECURITY_SESSION_TERMINATE,
        userId,
        updatedSession.id,
        {
          deviceType: { after: updatedSession.deviceType },
          deviceName: { after: updatedSession.deviceName },
          ipAddress: { after: updatedSession.ipAddress },
        },
        updatedSession.ipAddress,
      );

      return this.mapToDto(updatedSession);
    }

    // Create new session
    const newSession = await this.prisma.deviceSession.create({
      data: {
        userId,
        deviceType: deviceType as DeviceType,
        deviceToken,
        ...otherData,
        isActive: true,
      },
    });

    // Log new session creation
    await this.auditLogService.logUserAction(
      AuditAction.SECURITY_SESSION_TERMINATE,
      userId,
      newSession.id,
      {
        deviceType: { after: newSession.deviceType },
        deviceName: { after: newSession.deviceName },
        ipAddress: { after: newSession.ipAddress },
      },
      newSession.ipAddress,
    );

    return this.mapToDto(newSession);
  }

  async getUserSessions(userId: string): Promise<DeviceSessionListDto> {
    const sessions = await this.prisma.deviceSession.findMany({
      where: { userId },
      orderBy: { lastActive: 'desc' },
    });

    return {
      sessions: sessions.map((session) => this.mapToDto(session)),
      total: sessions.length,
    };
  }

  async getActiveUserSessions(userId: string): Promise<DeviceSessionListDto> {
    const sessions = await this.prisma.deviceSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActive: 'desc' },
    });

    return {
      sessions: sessions.map((session) => this.mapToDto(session)),
      total: sessions.length,
    };
  }

  async updateSession(
    sessionId: string,
    userId: string,
    updateData: UpdateDeviceSessionDto,
  ): Promise<DeviceSessionDto> {
    const session = await this.prisma.deviceSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Device session not found');
    }

    const updatedSession = await this.prisma.deviceSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    return this.mapToDto(updatedSession);
  }

  async updateLastActive(userId: string, deviceToken: string): Promise<void> {
    await this.prisma.deviceSession.updateMany({
      where: { userId, deviceToken },
      data: { lastActive: new Date() },
    });
  }

  async revokeSession(
    sessionId: string,
    userId: string,
  ): Promise<DeviceSessionDto> {
    const session = await this.prisma.deviceSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Device session not found');
    }

    const updatedSession = await this.prisma.deviceSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    // Log session revocation
    await this.auditLogService.logUserAction(
      AuditAction.SECURITY_SESSION_TERMINATE,
      userId,
      sessionId,
      {
        deviceType: { before: session.deviceType },
        isActive: { before: true, after: false },
      },
      session.ipAddress,
    );

    return this.mapToDto(updatedSession);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    // Get sessions before revoking for audit logging
    const sessions = await this.prisma.deviceSession.findMany({
      where: { userId, isActive: true },
    });

    await this.prisma.deviceSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Log session revocations
    for (const session of sessions) {
      await this.auditLogService.logUserAction(
        AuditAction.SECURITY_SESSION_TERMINATE,
        userId,
        session.id,
        {
          deviceType: { before: session.deviceType },
          isActive: { before: true, after: false },
          reason: { after: 'bulk_revocation' },
        },
        session.ipAddress,
      );
    }
  }

  async revokeAllUserSessionsExceptCurrent(
    userId: string,
    currentDeviceToken: string,
  ): Promise<void> {
    await this.prisma.deviceSession.updateMany({
      where: {
        userId,
        isActive: true,
        deviceToken: { not: currentDeviceToken },
      },
      data: { isActive: false },
    });
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.deviceSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Device session not found');
    }

    await this.prisma.deviceSession.delete({
      where: { id: sessionId },
    });
  }

  async deleteInactiveSessions(userId: string): Promise<void> {
    await this.prisma.deviceSession.deleteMany({
      where: { userId, isActive: false },
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.prisma.deviceSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  private mapToDto(session: DeviceSession): DeviceSessionDto {
    return {
      id: session.id,
      deviceType: session.deviceType,
      deviceName: session.deviceName || undefined,
      userAgent: session.userAgent || undefined,
      ipAddress: session.ipAddress,
      location: session.location || undefined,
      isActive: session.isActive,
      createdAt: session.createdAt,
      lastActive: session.lastActive,
      expiresAt: session.expiresAt || undefined,
    };
  }
}
