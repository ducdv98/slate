import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditAction, AuditTargetType } from '../types/audit.types';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new audit log entry
   */
  async logAction(
    action: AuditAction,
    targetType: AuditTargetType,
    targetId: string,
    workspaceId?: string,
    userId?: string,
    changes?: Record<string, { before?: any; after?: any }>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          workspaceId,
          userId,
          action,
          targetType,
          targetId,
          changes: changes || null,
          ipAddress,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Helper method to log workspace actions
   */
  async logWorkspaceAction(
    action: AuditAction,
    workspaceId: string,
    userId: string,
    targetId: string,
    changes?: Record<string, { before?: any; after?: any }>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction(
      action,
      AuditTargetType.WORKSPACE,
      targetId,
      workspaceId,
      userId,
      changes,
      ipAddress,
    );
  }

  /**
   * Helper method to log user actions
   */
  async logUserAction(
    action: AuditAction,
    userId: string,
    targetId: string,
    changes?: Record<string, { before?: any; after?: any }>,
    ipAddress?: string,
    workspaceId?: string,
  ): Promise<void> {
    await this.logAction(
      action,
      AuditTargetType.USER,
      targetId,
      workspaceId,
      userId,
      changes,
      ipAddress,
    );
  }

  /**
   * Helper method to log permission actions
   */
  async logPermissionAction(
    action: AuditAction,
    workspaceId: string,
    userId: string,
    targetId: string,
    changes?: Record<string, { before?: any; after?: any }>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction(
      action,
      AuditTargetType.PERMISSION,
      targetId,
      workspaceId,
      userId,
      changes,
      ipAddress,
    );
  }

  /**
   * Get audit logs for a workspace
   */
  async getWorkspaceAuditLogs(
    workspaceId: string,
    page = 1,
    limit = 50,
  ): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: { workspaceId } }),
    ]);

    return { logs, total, page, limit };
  }
}
