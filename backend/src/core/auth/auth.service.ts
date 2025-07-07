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
import {
  SignupDto,
  LoginDto,
  AuthResponseDto,
  AuthTokensDto,
  UserDto,
  SendVerificationEmailDto,
  VerifyEmailDto,
  EmailVerificationResponseDto,
} from './dto';

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

@Injectable()
export class AuthService {
  private readonly prisma: PrismaService;
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;
  private readonly mailerService: MailerService;

  constructor(
    prisma: PrismaService,
    jwtService: JwtService,
    configService: ConfigService,
    mailerService: MailerService,
  ) {
    this.prisma = prisma;
    this.jwtService = jwtService;
    this.configService = configService;
    this.mailerService = mailerService;
  }

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
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

    // Generate tokens with rotation
    const tokens = await this.generateTokensWithRotation(user.id, user.email);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

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

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens with rotation
    const tokens = await this.generateTokensWithRotation(user.id, user.email);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

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
    const newTokens = await this.generateTokensWithRotation(userId, email);

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
