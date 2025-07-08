import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards';
import {
  SignupDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  AuthTokensDto,
  UserDto,
  SendVerificationEmailDto,
  VerifyEmailDto,
  EmailVerificationResponseDto,
} from './dto';
import { JwtPayload } from 'jsonwebtoken';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthResponseDto | UserDto;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractDeviceSessionData(
    request: ExpressRequest,
    headers: Record<string, string>,
  ): {
    deviceType: 'ios' | 'android' | 'web';
    deviceToken: string;
    deviceName?: string;
    userAgent?: string;
    ipAddress: string;
    location?: string;
  } {
    const userAgent = headers['user-agent'] || '';

    // Determine device type from user agent
    let deviceType: 'ios' | 'android' | 'web' = 'web';
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      deviceType =
        userAgent.includes('iPhone') || userAgent.includes('iOS')
          ? 'ios'
          : 'android';
    }

    // Generate device token (combination of IP + User Agent hash)
    const deviceToken = Buffer.from(`${request.ip || 'unknown'}-${userAgent}`)
      .toString('base64')
      .slice(0, 32);

    // Extract device name from custom header or user agent
    const deviceName = headers['x-device-name'];

    // Get IP address
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      'unknown';

    // Extract location from custom header
    const location = headers['x-device-location'];

    return {
      deviceType,
      deviceToken,
      deviceName,
      userAgent,
      ipAddress,
      location,
    };
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration',
    description: 'Register a new user account',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async signup(
    @Body() signupDto: SignupDto,
    @Request() req: ExpressRequest,
    @Headers() headers: Record<string, string>,
  ): Promise<AuthResponseDto> {
    const deviceSessionData = this.extractDeviceSessionData(req, headers);
    return this.authService.signup(signupDto, deviceSessionData);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and return JWT tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest,
    @Headers() headers: Record<string, string>,
  ): Promise<AuthResponseDto> {
    const deviceSessionData = this.extractDeviceSessionData(req, headers);
    return this.authService.login(loginDto, deviceSessionData);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens successfully refreshed',
    type: AuthTokensDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
  })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: ExpressRequest,
    @Headers() headers: Record<string, string>,
  ): Promise<AuthTokensDto> {
    const deviceSessionData = this.extractDeviceSessionData(req, headers);
    const tokens = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
    );

    // Update device session activity after successful token refresh
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded = this.authService['jwtService'].decode(tokens.accessToken);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (decoded?.sub) {
        await this.authService.updateDeviceSessionLastActive(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
          decoded.sub,
          deviceSessionData.deviceToken,
        );
      }
    } catch (error) {
      // Don't fail the refresh if device session update fails
      console.warn('Failed to update device session during refresh:', error);
    }

    return tokens;
  }

  @Post('send-verification-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send email verification',
    description: 'Send verification email to user',
  })
  @ApiBody({ type: SendVerificationEmailDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email sent successfully',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email is already verified or failed to send email',
  })
  async sendVerificationEmail(
    @Body() sendVerificationEmailDto: SendVerificationEmailDto,
  ): Promise<EmailVerificationResponseDto> {
    return this.authService.sendVerificationEmail(sendVerificationEmailDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using verification token',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired verification token',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<EmailVerificationResponseDto> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description: 'Revoke current refresh token and device session',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully logged out',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: AuthenticatedRequest,
    @Headers() headers: Record<string, string>,
  ): Promise<{ message: string }> {
    const userId = (req.user as UserDto).id;
    const deviceSessionData = this.extractDeviceSessionData(req, headers);

    try {
      // Extract token ID from refresh token and revoke it
      const decoded = this.authService['jwtService'].verify<JwtPayload>(
        refreshTokenDto.refreshToken,
        {
          secret: this.authService['configService'].get<string>(
            'auth.jwtRefreshSecret',
          ),
        },
      );

      if (decoded && typeof decoded === 'object' && 'tokenId' in decoded) {
        await this.authService.revokeRefreshToken(decoded.tokenId as string);
      }

      // Also revoke the device session
      await this.authService[
        'deviceSessionService'
      ].revokeAllUserSessionsExceptCurrent(
        userId,
        deviceSessionData.deviceToken,
      );
    } catch (error) {
      // Continue with logout even if token/session operations fail
      console.warn('Error during logout:', error);
    }

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout from all devices',
    description:
      'Revoke all refresh tokens and device sessions for the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully logged out from all devices',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async logoutAll(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const userId = (req.user as UserDto).id;

    // Revoke all refresh tokens
    await this.authService.revokeAllUserTokens(userId);

    // Revoke all device sessions
    await this.authService['deviceSessionService'].revokeAllUserSessions(
      userId,
    );

    return { message: 'Logged out from all devices successfully' };
  }
}
