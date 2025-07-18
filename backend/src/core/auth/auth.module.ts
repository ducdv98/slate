import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../database/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy, LocalStrategy } from './strategies';
import { UsersModule } from '../../modules/users/users.module';
import { WorkspaceModule } from '../../modules/workspace/workspace.module';
import { InvitationService } from './services/invitation.service';
import { AuditLogService } from '../../shared/services/audit-log.service';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    WorkspaceModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtExpiresIn'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    PrismaService,
    MailerService,
    InvitationService,
    AuditLogService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
