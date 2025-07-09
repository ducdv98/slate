import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { PermissionService } from './services/permission.service';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import { WorkspacePermissionGuard } from '../../common/guards/workspace-permission.guard';
import { InvitationService } from '../../core/auth/services/invitation.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../../core/mailer/mailer.service';

@Module({
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    PermissionService,
    PrismaService,
    AuditLogService,
    WorkspacePermissionGuard,
    InvitationService,
    JwtService,
    ConfigService,
    MailerService,
  ],
  exports: [WorkspaceService, PermissionService],
})
export class WorkspaceModule {}
