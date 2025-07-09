import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { PermissionService } from './services/permission.service';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import { WorkspacePermissionGuard } from '../../common/guards/workspace-permission.guard';

@Module({
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    PermissionService,
    PrismaService,
    AuditLogService,
    WorkspacePermissionGuard,
  ],
  exports: [WorkspaceService, PermissionService],
})
export class WorkspaceModule {}
