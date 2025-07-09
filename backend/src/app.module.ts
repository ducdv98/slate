import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './core/database/prisma.service';
import { AuthModule } from './core/auth';
import { UsersModule } from './modules/users/users.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import mailerConfig from './config/mailer.config';
import cacheConfig from './config/cache.config';
import throttleConfig from './config/throttle.config';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        mailerConfig,
        cacheConfig,
        throttleConfig,
      ],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validate,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    AuthModule,
    UsersModule,
    WorkspaceModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
