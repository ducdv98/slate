import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, PrismaService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
