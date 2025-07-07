import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard, LocalAuthGuard } from './guards';
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

interface AuthenticatedRequest extends Request {
  user: AuthResponseDto | UserDto;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(signupDto);
  }

  @UseGuards(LocalAuthGuard)
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
  login(@Request() req: AuthenticatedRequest): AuthResponseDto {
    return req.user as AuthResponseDto;
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
  ): Promise<AuthTokensDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get current authenticated user profile',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  getProfile(@Request() req: AuthenticatedRequest): UserDto {
    return req.user as UserDto;
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
    description: 'Revoke current refresh token',
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
  ): Promise<{ message: string }> {
    try {
      // Extract token ID from refresh token

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
    } catch {
      // Token might be invalid, but that's okay for logout
    }

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout from all devices',
    description: 'Revoke all refresh tokens for the current user',
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
    await this.authService.revokeAllUserTokens(userId);
    return { message: 'Logged out from all devices successfully' };
  }
}
