import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, RefreshToken } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { DeviceSessionService } from '../../modules/users/device-session.service';
import { WorkspaceService } from '../../modules/workspace/workspace.service';
import { InvitationService } from './services/invitation.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import {
  SignupDto,
  LoginDto,
  AuthResponseDto,
  AuthTokensDto,
  UserDto,
  SendVerificationEmailDto,
  VerifyEmailDto,
  EmailVerificationResponseDto,
  SignupWithWorkspaceDto,
  SignupWithInvitationDto,
  InvitationInfoDto,
} from './dto';
import { CreateWorkspaceDto } from '../../modules/workspace/dto';
import { AuditAction, AuditTargetType } from '../../shared/types/audit.types';

interface JwtPayload {
  sub: string;
  email: string;
}

interface EmailVerificationPayload {
  userId: string;
  email: string;
  type: 'email-verification';
}

interface RefreshTokenPayload {
  sub: string;
  email: string;
  tokenId: string;
}

interface DeviceSessionData {
  deviceType: 'ios' | 'android' | 'web';
  deviceToken: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress: string;
  location?: string;
}

@Injectable()
export class AuthService {
  private readonly prisma: PrismaService;
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;
  private readonly mailerService: MailerService;
  private readonly deviceSessionService: DeviceSessionService;
  private readonly workspaceService: WorkspaceService;
  private readonly invitationService: InvitationService;
  private readonly auditLogService: AuditLogService;

  constructor(
    prisma: PrismaService,
    jwtService: JwtService,
    configService: ConfigService,
    mailerService: MailerService,
    deviceSessionService: DeviceSessionService,
    workspaceService: WorkspaceService,
    invitationService: InvitationService,
    auditLogService: AuditLogService,
  ) {
    this.prisma = prisma;
    this.jwtService = jwtService;
    this.configService = configService;
    this.mailerService = mailerService;
    this.deviceSessionService = deviceSessionService;
    this.workspaceService = workspaceService;
    this.invitationService = invitationService;
    this.auditLogService = auditLogService;
  }

  async signup(
    signupDto: SignupDto,
    deviceSessionData?: DeviceSessionData,
  ): Promise<AuthResponseDto> {
    const { name, email, password } = signupDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds =
      this.configService.get<number>('auth.bcryptRounds') || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    // Log user signup
    await this.auditLogService.logUserAction(
      AuditAction.USER_SIGNUP,
      user.id,
      user.id,
      { email: { after: user.email }, name: { after: user.name } },
      deviceSessionData?.ipAddress,
    );

    // Generate tokens with rotation
    const tokens = await this.generateTokensWithRotation(user.id, user.email);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create device session if device data is provided
    if (deviceSessionData) {
      try {
        await this.deviceSessionService.createOrUpdateSession(
          user.id,
          deviceSessionData,
        );
      } catch (error) {
        // Don't fail signup if device session creation fails
        console.warn('Failed to create device session:', error);
      }
    }

    // Send verification email
    try {
      await this.sendVerificationEmail({ email: user.email });
    } catch {
      // Don't fail signup if email sending fails
      console.warn('Failed to send verification email');
    }

    return {
      tokens,
      user: this.mapUserToDto(user),
    };
  }

  async login(
    loginDto: LoginDto,
    deviceSessionData?: DeviceSessionData,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Log failed login attempt
      await this.auditLogService.logAction(
        AuditAction.SECURITY_LOGIN_FAILED,
        AuditTargetType.USER,
        email,
        undefined,
        undefined,
        { reason: { after: 'user_not_found' }, email: { after: email } },
        deviceSessionData?.ipAddress,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Log failed login attempt
      await this.auditLogService.logUserAction(
        AuditAction.SECURITY_LOGIN_FAILED,
        user.id,
        user.id,
        { reason: { after: 'invalid_password' }, email: { after: email } },
        deviceSessionData?.ipAddress,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Log successful login
    await this.auditLogService.logUserAction(
      AuditAction.USER_LOGIN,
      user.id,
      user.id,
      { email: { after: user.email } },
      deviceSessionData?.ipAddress,
    );

    // Generate tokens with rotation
    const tokens = await this.generateTokensWithRotation(user.id, user.email);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create or update device session if device data is provided
    if (deviceSessionData) {
      try {
        await this.deviceSessionService.createOrUpdateSession(
          user.id,
          deviceSessionData,
        );
      } catch (error) {
        // Don't fail login if device session creation fails
        console.warn('Failed to create/update device session:', error);
      }
    }

    return {
      tokens,
      user: this.mapUserToDto(user),
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokensDto> {
    try {
      // First verify the JWT signature
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
      });

      // Type guard to ensure payload has expected structure
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'sub' in decoded &&
        'email' in decoded &&
        'tokenId' in decoded &&
        typeof decoded.sub === 'string' &&
        typeof decoded.email === 'string' &&
        typeof decoded.tokenId === 'string'
      ) {
        const payload: RefreshTokenPayload = {
          sub: decoded.sub,
          email: decoded.email,
          tokenId: decoded.tokenId,
        };
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

        // Check if refresh token exists in database and is not revoked
        const storedToken = await this.prisma.refreshToken.findUnique({
          where: { token: refreshToken },
          include: { user: true },
        });

        if (!storedToken || storedToken.revokedAt) {
          throw new UnauthorizedException('Invalid refresh token');
        }

        // Check if token is expired
        if (storedToken.expiresAt < new Date()) {
          // Clean up expired token
          await this.prisma.refreshToken.delete({
            where: { id: storedToken.id },
          });
          throw new UnauthorizedException('Refresh token expired');
        }

        // Verify token ID matches
        if (storedToken.id !== payload.tokenId) {
          throw new UnauthorizedException('Invalid refresh token');
        }

        // Revoke the used refresh token and generate new tokens
        const newTokens = await this.rotateRefreshToken(
          storedToken,
          payload.sub,
          payload.email,
        );

        return newTokens;
      }

      throw new UnauthorizedException('Invalid refresh token');
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
  }

  async validateUser(userId: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return this.mapUserToDto(user);
  }

  async sendVerificationEmail(
    sendVerificationEmailDto: SendVerificationEmailDto,
  ): Promise<EmailVerificationResponseDto> {
    const { email } = sendVerificationEmailDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate verification token
    const verificationToken = await this.generateEmailVerificationToken(
      user.id,
      user.email,
    );

    // Send verification email
    try {
      await this.mailerService.sendVerificationEmail(email, verificationToken);
      return {
        message: 'Verification email sent successfully',
        success: true,
      };
    } catch {
      throw new BadRequestException('Failed to send verification email');
    }
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<EmailVerificationResponseDto> {
    const { token } = verifyEmailDto;

    try {
      // Verify the email verification token
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('auth.jwtSecret'),
      });

      // Validate token type
      if (decoded.type !== 'email-verification') {
        throw new BadRequestException('Invalid verification token');
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.email !== decoded.email) {
        throw new BadRequestException('Invalid verification token');
      }

      if (user.emailVerified) {
        return {
          message: 'Email is already verified',
          success: true,
        };
      }

      // Update user email verification status
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      // Log email verification
      await this.auditLogService.logUserAction(
        AuditAction.USER_EMAIL_VERIFY,
        user.id,
        user.id,
        { email: { after: user.email }, emailVerified: { after: true } },
      );

      return {
        message: 'Email verified successfully',
        success: true,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  private async generateTokensWithRotation(
    userId: string,
    email: string,
  ): Promise<AuthTokensDto> {
    // Create refresh token record in database
    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        token: '', // Will be updated after JWT generation
        expiresAt: new Date(
          Date.now() +
            this.parseTokenExpiration(
              this.configService.get<string>('auth.jwtRefreshExpiresIn') ||
                '7d',
            ),
        ),
      },
    });

    const accessPayload: JwtPayload = { sub: userId, email };
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      email,
      tokenId: refreshTokenRecord.id,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('auth.jwtSecret'),
        expiresIn: this.configService.get<string>('auth.jwtExpiresIn'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
        expiresIn: this.configService.get<string>('auth.jwtRefreshExpiresIn'),
      }),
    ]);

    // Update the refresh token record with the actual JWT
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { token: refreshToken },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async rotateRefreshToken(
    oldToken: RefreshToken & { user: User },
    userId: string,
    email: string,
  ): Promise<AuthTokensDto> {
    // Generate new tokens
    const newTokens = await this.generateTokensWithRotation(
      oldToken.user.id,
      oldToken.user.email,
    );

    // Log token refresh
    await this.auditLogService.logUserAction(
      AuditAction.SECURITY_TOKEN_REFRESH,
      oldToken.user.id,
      oldToken.user.id,
      { email: { after: oldToken.user.email } },
    );

    // Revoke the old token and link to new one
    await this.prisma.refreshToken.update({
      where: { id: oldToken.id },
      data: {
        revokedAt: new Date(),
        replacedBy: newTokens.refreshToken,
      },
    });

    return newTokens;
  }

  private parseTokenExpiration(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000; // Default to 7 days
    }
  }

  private async generateEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload: EmailVerificationPayload = {
      userId,
      email,
      type: 'email-verification',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.jwtSecret'),
      expiresIn: '24h', // Email verification tokens expire in 24 hours
    });
  }

  async updateDeviceSessionLastActive(
    userId: string,
    deviceToken: string,
  ): Promise<void> {
    try {
      await this.deviceSessionService.updateLastActive(userId, deviceToken);
    } catch (error) {
      // Don't fail the request if device session update fails
      console.warn('Failed to update device session last active:', error);
    }
  }

  /**
   * Sign up with workspace creation
   */
  async signupWithWorkspace(
    signupData: SignupWithWorkspaceDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    // Create user first
    const userDto = {
      name: signupData.name,
      email: signupData.email,
      password: signupData.password,
    };

    const authResponse = await this.signup(userDto, {
      deviceType: 'web',
      deviceToken: `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userAgent: userAgent || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
    });

    try {
      // Create workspace and make user an admin
      const createWorkspaceDto: CreateWorkspaceDto = {
        name: signupData.workspaceName,
        description: signupData.workspaceDescription,
      };

      const workspace = await this.workspaceService.create(
        createWorkspaceDto,
        authResponse.user.id,
      );

      // Log successful workspace creation during signup
      console.log(
        `✅ User ${authResponse.user.email} signed up with workspace: ${workspace.name}`,
      );

      // Note: We return the same AuthResponseDto format for consistency
      // The workspace information is logged and available via workspace endpoints
      return authResponse;
    } catch (error) {
      // If workspace creation fails, we still have a valid user account
      // Log the error and let the user create a workspace later
      console.warn(
        `⚠️ Failed to create workspace for user ${authResponse.user.email}:`,
        error,
      );

      // Still return successful auth response since user creation succeeded
      return authResponse;
    }
  }

  /**
   * Sign up with invitation token
   */
  async signupWithInvitation(
    signupData: SignupWithInvitationDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    // First, verify the invitation token to get workspace info
    const invitationInfo = await this.invitationService.verifyInvitationToken(
      signupData.invitationToken,
    );

    // Decode the token to get the invited email for validation
    let invitedEmail: string;
    try {
      const decodedToken = this.jwtService.decode(
        signupData.invitationToken,
      ) as { email?: string } | null;
      invitedEmail = decodedToken?.email || '';
    } catch {
      throw new BadRequestException('Invalid invitation token format');
    }

    if (!invitedEmail) {
      throw new BadRequestException('Invalid invitation token: missing email');
    }

    // Verify that the email in signup matches the invitation
    if (signupData.email !== invitedEmail) {
      throw new BadRequestException(
        `This invitation was sent to ${invitedEmail}. Please use the correct email address or request a new invitation.`,
      );
    }

    // Create user account first
    const userDto = {
      name: signupData.name,
      email: signupData.email,
      password: signupData.password,
    };

    const authResponse = await this.signup(userDto, {
      deviceType: 'web',
      deviceToken: `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userAgent: userAgent || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
    });

    try {
      // Accept the invitation and add user to workspace
      await this.invitationService.acceptInvitation(
        signupData.invitationToken,
        authResponse.user.id,
        ipAddress,
      );

      // Log successful invitation acceptance
      console.log(
        `✅ User ${authResponse.user.email} accepted invitation to workspace: ${invitationInfo.workspace.name}`,
      );

      // Return the auth response with user now being a member of the workspace
      return authResponse;
    } catch (error) {
      // If invitation acceptance fails, we still have a valid user account
      // but they won't be added to the workspace
      console.warn(
        `⚠️ Failed to accept invitation for user ${authResponse.user.email}:`,
        error,
      );

      // Since invitation acceptance is critical for this flow, we should throw an error
      throw new BadRequestException(
        `User account created but failed to join workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get invitation information
   */
  async getInvitationInfo(token: string): Promise<InvitationInfoDto> {
    try {
      return await this.invitationService.getInvitationInfo(token);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException(
        `Invalid or expired invitation token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private mapUserToDto(user: User): UserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl || undefined,
      timezone: user.timezone || undefined,
    };
  }
}
