import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  HttpStatus,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDecorator,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../../common/guards/workspace-permission.guard';
import {
  RequireAdmin,
  CanViewWorkspace,
  CanUpdateWorkspace,
  CanDeleteWorkspace,
  CanViewMembers,
  CanInviteMembers,
  CanUpdateMembers,
  CanRemoveMembers,
} from '../../common/decorators/workspace-permissions.decorator';
import { WorkspaceService } from './workspace.service';
import { InvitationService } from '../../core/auth/services/invitation.service';
import {
  PermissionService,
  UserWorkspacePermissions,
} from './services/permission.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
  InviteMemberDto,
  UpdateMembershipDto,
  WorkspaceMemberDto,
  WorkspaceMembersListDto,
} from './dto';
import {
  CreateInvitationDto,
  InvitationTokenDto,
} from '../../core/auth/dto/invitation.dto';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ApiResponse } from '../../shared/types/response.types';
import { ResponseUtil } from '../../shared/utils/response.util';
import { PermissionOverride } from '../../shared/constants/permissions.constants';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  ip?: string;
}

@ApiTags('Workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly permissionService: PermissionService,
    private readonly invitationService: InvitationService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create workspace',
    description: 'Create a new workspace and automatically become its admin',
  })
  @ApiBody({
    type: CreateWorkspaceDto,
    description: 'Workspace creation data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CREATED,
    description: 'Workspace created successfully',
    type: WorkspaceDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.CONFLICT,
    description: 'Workspace with this name already exists',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<WorkspaceDto>> {
    const workspace = await this.workspaceService.create(
      createWorkspaceDto,
      req.user.id,
    );
    return ResponseUtil.created(workspace, 'Workspace created successfully');
  }

  @Get()
  @ApiOperation({
    summary: 'Get user workspaces',
    description:
      'Retrieve all workspaces the authenticated user is a member of',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Workspaces retrieved successfully',
    type: [WorkspaceDto],
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findAll(
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<WorkspaceDto[]>> {
    const workspaces = await this.workspaceService.findAll(req.user.id);
    return ResponseUtil.success(
      workspaces,
      'Workspaces retrieved successfully',
    );
  }

  @Get(':id')
  @UseGuards(WorkspacePermissionGuard)
  @CanViewWorkspace()
  @ApiOperation({
    summary: 'Get workspace',
    description: 'Retrieve a specific workspace by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Workspace retrieved successfully',
    type: WorkspaceDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findOne(
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<WorkspaceDto>> {
    const workspace = await this.workspaceService.findOne(id, req.user.id);
    return ResponseUtil.success(workspace, 'Workspace retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(WorkspacePermissionGuard)
  @CanUpdateWorkspace()
  @ApiOperation({
    summary: 'Update workspace',
    description: 'Update workspace details (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiBody({
    type: UpdateWorkspaceDto,
    description: 'Workspace update data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Workspace updated successfully',
    type: WorkspaceDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CONFLICT,
    description: 'Workspace with this name already exists',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<WorkspaceDto>> {
    const workspace = await this.workspaceService.update(
      id,
      updateWorkspaceDto,
      req.user.id,
    );
    return ResponseUtil.updated(workspace, 'Workspace updated successfully');
  }

  @Delete(':id')
  @UseGuards(WorkspacePermissionGuard)
  @CanDeleteWorkspace()
  @ApiOperation({
    summary: 'Delete workspace',
    description: 'Delete a workspace (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Workspace deleted successfully',
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete workspace. You are the only admin.',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async remove(
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<null>> {
    await this.workspaceService.remove(id, req.user.id);
    return ResponseUtil.deleted('Workspace deleted successfully');
  }

  // Member management endpoints with RBAC

  @Get(':id/members')
  @UseGuards(WorkspacePermissionGuard)
  @CanViewMembers()
  @ApiOperation({
    summary: 'Get workspace members',
    description: 'Retrieve paginated list of workspace members',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
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
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Members retrieved successfully',
    type: WorkspaceMembersListDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async getMembers(
    @Param('id', UuidValidationPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<WorkspaceMembersListDto>> {
    const members = await this.workspaceService.getMembers(
      id,
      req.user.id,
      page,
      limit,
    );
    return ResponseUtil.success(members, 'Members retrieved successfully');
  }

  @Post(':id/members')
  @UseGuards(WorkspacePermissionGuard)
  @CanInviteMembers()
  @ApiOperation({
    summary: 'Invite member',
    description: 'Invite a user to join the workspace',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiBody({
    type: InviteMemberDto,
    description: 'Member invitation data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CREATED,
    description: 'Member invited successfully',
    type: WorkspaceMemberDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace or user not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CONFLICT,
    description: 'User is already a member of this workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async inviteMember(
    @Param('id', UuidValidationPipe) id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<WorkspaceMemberDto>> {
    const member = await this.workspaceService.inviteMember(
      id,
      inviteMemberDto,
      req.user.id,
    );
    return ResponseUtil.created(member, 'Member invited successfully');
  }

  @Post(':id/invitations')
  @UseGuards(WorkspacePermissionGuard)
  @CanInviteMembers()
  @ApiOperation({
    summary: 'Create workspace invitation',
    description: 'Create an invitation token for a user to join the workspace',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiBody({
    type: CreateInvitationDto,
    description: 'Invitation creation data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CREATED,
    description: 'Invitation created successfully',
    type: InvitationTokenDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to invite members',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async createInvitation(
    @Param('id', UuidValidationPipe) id: string,
    @Body() createInvitationDto: CreateInvitationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<InvitationTokenDto>> {
    // Override workspaceId with the one from the URL parameter
    const invitationData = {
      ...createInvitationDto,
      workspaceId: id,
    };

    const invitation = await this.invitationService.createInvitation(
      req.user.id,
      invitationData,
      req.ip,
    );

    return ResponseUtil.created(invitation, 'Invitation created successfully');
  }

  @Patch(':id/members/:memberId')
  @UseGuards(WorkspacePermissionGuard)
  @CanUpdateMembers()
  @ApiOperation({
    summary: 'Update member',
    description: 'Update member role or status',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'memberId',
    description: 'Member user ID',
    type: String,
  })
  @ApiBody({
    type: UpdateMembershipDto,
    description: 'Membership update data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Member updated successfully',
    type: WorkspaceMemberDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace or membership not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot modify your own membership or remove last admin',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateMember(
    @Param('id', UuidValidationPipe) id: string,
    @Param('memberId', UuidValidationPipe) memberId: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<WorkspaceMemberDto>> {
    const member = await this.workspaceService.updateMembership(
      id,
      memberId,
      updateMembershipDto,
      req.user.id,
    );
    return ResponseUtil.updated(member, 'Member updated successfully');
  }

  @Delete(':id/members/:memberId')
  @UseGuards(WorkspacePermissionGuard)
  @CanRemoveMembers()
  @ApiOperation({
    summary: 'Remove member',
    description: 'Remove a member from the workspace',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'memberId',
    description: 'Member user ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Member removed successfully',
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace or membership not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot remove yourself or the only admin',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async removeMember(
    @Param('id', UuidValidationPipe) id: string,
    @Param('memberId', UuidValidationPipe) memberId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<null>> {
    await this.workspaceService.removeMember(id, memberId, req.user.id);
    return ResponseUtil.deleted('Member removed successfully');
  }

  // New RBAC-specific endpoints

  @Get(':id/permissions')
  @UseGuards(WorkspacePermissionGuard)
  @CanViewWorkspace()
  @ApiOperation({
    summary: 'Get user permissions',
    description: "Get current user's permissions in the workspace",
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'User permissions retrieved successfully',
  })
  async getUserPermissions(
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<UserWorkspacePermissions>> {
    const permissions = await this.permissionService.getUserPermissions(
      req.user.id,
      id,
    );

    if (!permissions) {
      throw new ForbiddenException('User is not a member of this workspace');
    }

    return ResponseUtil.success(
      permissions,
      'User permissions retrieved successfully',
    );
  }

  @Get(':id/members/:memberId/permissions')
  @UseGuards(WorkspacePermissionGuard)
  @RequireAdmin()
  @ApiOperation({
    summary: 'Get member permissions',
    description:
      "Get specific member's permissions in the workspace (admin only)",
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Member permissions retrieved successfully',
  })
  async getMemberPermissions(
    @Param('id', UuidValidationPipe) id: string,
    @Param('memberId', UuidValidationPipe) memberId: string,
  ): Promise<ApiResponse<UserWorkspacePermissions>> {
    const permissions = await this.permissionService.getUserPermissions(
      memberId,
      id,
    );

    if (!permissions) {
      throw new NotFoundException('User is not a member of this workspace');
    }

    return ResponseUtil.success(
      permissions,
      'Member permissions retrieved successfully',
    );
  }

  @Patch(':id/members/:memberId/permissions')
  @UseGuards(WorkspacePermissionGuard)
  @RequireAdmin()
  @ApiOperation({
    summary: 'Update member permission overrides',
    description:
      'Update permission overrides for a specific member (admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        granted: {
          type: 'array',
          items: { type: 'string' },
          description: 'Permissions to grant beyond role defaults',
        },
        revoked: {
          type: 'array',
          items: { type: 'string' },
          description: 'Permissions to revoke from role defaults',
        },
      },
    },
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Permission overrides updated successfully',
  })
  async updateMemberPermissions(
    @Param('id', UuidValidationPipe) id: string,
    @Param('memberId', UuidValidationPipe) memberId: string,
    @Body() overrides: PermissionOverride,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<null>> {
    await this.permissionService.updatePermissionOverrides(
      memberId,
      id,
      overrides,
      req.user.id,
    );

    return ResponseUtil.success(
      null,
      'Permission overrides updated successfully',
    );
  }

  @Delete(':id/members/:memberId/permissions')
  @UseGuards(WorkspacePermissionGuard)
  @RequireAdmin()
  @ApiOperation({
    summary: 'Clear member permission overrides',
    description:
      'Clear all permission overrides for a specific member (admin only)',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Permission overrides cleared successfully',
  })
  async clearMemberPermissions(
    @Param('id', UuidValidationPipe) id: string,
    @Param('memberId', UuidValidationPipe) memberId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<null>> {
    await this.permissionService.clearPermissionOverrides(
      memberId,
      id,
      req.user.id,
    );

    return ResponseUtil.success(
      null,
      'Permission overrides cleared successfully',
    );
  }
}
