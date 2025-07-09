import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from '../../core/database/prisma.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DeviceSessionService } from './device-session.service';
import { DeviceSessionInterceptor } from '../../common/interceptors';
import { AuditLogService } from '../../shared/services/audit-log.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    DeviceSessionService,
    PrismaService,
    AuditLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DeviceSessionInterceptor,
    },
  ],
  exports: [UsersService, DeviceSessionService],
})
export class UsersModule {}
