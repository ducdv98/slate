import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { DeviceSessionService } from './device-session.service';
import { JwtAuthGuard } from '../../core/auth/guards';
import {
  UpdateUserDto,
  UpdatePreferencesDto,
  UserProfileDto,
  DeviceSessionListDto,
  DeviceSessionDto,
  UpdateDeviceSessionDto,
} from './dto';
import { UuidValidationPipe } from '../../common/pipes';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly deviceSessionService: DeviceSessionService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve paginated list of users with optional search',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ): Promise<{ users: UserProfileDto[]; total: number; totalPages: number }> {
    return this.usersService.findAll(page, limit, search);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user profile',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async getProfile(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserProfileDto> {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve user profile by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findOne(
    @Param('id', UuidValidationPipe) id: string,
  ): Promise<UserProfileDto> {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update the authenticated user profile',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Patch('me/preferences')
  @ApiOperation({
    summary: 'Update current user preferences',
    description: 'Update notification preferences and keyboard shortcuts',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User preferences updated successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updatePreferences(
      req.user.id,
      updatePreferencesDto,
    );
  }

  @Get('me/sessions')
  @ApiOperation({
    summary: 'Get current user device sessions',
    description: 'Retrieve all device sessions for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device sessions retrieved successfully',
    type: DeviceSessionListDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async getUserSessions(
    @Request() req: AuthenticatedRequest,
  ): Promise<DeviceSessionListDto> {
    return this.deviceSessionService.getUserSessions(req.user.id);
  }

  @Get('me/sessions/active')
  @ApiOperation({
    summary: 'Get active device sessions',
    description:
      'Retrieve only active device sessions for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active device sessions retrieved successfully',
    type: DeviceSessionListDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async getActiveUserSessions(
    @Request() req: AuthenticatedRequest,
  ): Promise<DeviceSessionListDto> {
    return this.deviceSessionService.getActiveUserSessions(req.user.id);
  }

  @Patch('me/sessions/:sessionId')
  @ApiOperation({
    summary: 'Update device session',
    description: 'Update device session details like name or location',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Device session ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device session updated successfully',
    type: DeviceSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device session not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateDeviceSession(
    @Request() req: AuthenticatedRequest,
    @Param('sessionId', UuidValidationPipe) sessionId: string,
    @Body() updateData: UpdateDeviceSessionDto,
  ): Promise<DeviceSessionDto> {
    return this.deviceSessionService.updateSession(
      sessionId,
      req.user.id,
      updateData,
    );
  }

  @Delete('me/sessions/:sessionId')
  @ApiOperation({
    summary: 'Revoke device session',
    description: 'Revoke (deactivate) a specific device session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Device session ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device session revoked successfully',
    type: DeviceSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device session not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async revokeDeviceSession(
    @Request() req: AuthenticatedRequest,
    @Param('sessionId', UuidValidationPipe) sessionId: string,
  ): Promise<DeviceSessionDto> {
    return this.deviceSessionService.revokeSession(sessionId, req.user.id);
  }

  @Delete('me/sessions')
  @ApiOperation({
    summary: 'Revoke all device sessions',
    description: 'Revoke all device sessions for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All device sessions revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async revokeAllDeviceSessions(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.deviceSessionService.revokeAllUserSessions(req.user.id);
    return { message: 'All device sessions revoked successfully' };
  }
}
