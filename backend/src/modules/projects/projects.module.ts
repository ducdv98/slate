import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import { WorkspacePermissionGuard } from '../../common/guards/workspace-permission.guard';
import { PermissionService } from '../workspace/services/permission.service';

@Module({
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    PrismaService,
    AuditLogService,
    WorkspacePermissionGuard,
    PermissionService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
