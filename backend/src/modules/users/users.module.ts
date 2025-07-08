import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from '../../core/database/prisma.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DeviceSessionService } from './device-session.service';
import { DeviceSessionInterceptor } from '../../common/interceptors';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    DeviceSessionService,
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DeviceSessionInterceptor,
    },
  ],
  exports: [UsersService, DeviceSessionService],
})
export class UsersModule {}
