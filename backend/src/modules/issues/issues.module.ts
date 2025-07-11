import { Module } from '@nestjs/common';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import { WorkspacePermissionGuard } from '../../common/guards/workspace-permission.guard';
import { PermissionService } from '../workspace/services/permission.service';

@Module({
  controllers: [IssuesController],
  providers: [
    IssuesService,
    PrismaService,
    AuditLogService,
    WorkspacePermissionGuard,
    PermissionService,
  ],
  exports: [IssuesService],
})
export class IssuesModule {}
