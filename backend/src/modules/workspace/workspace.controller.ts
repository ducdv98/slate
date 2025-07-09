import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../../core/auth/guards';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
  WorkspaceMemberDto,
  InviteMemberDto,
  UpdateMembershipDto,
  WorkspaceMembersListDto,
} from './dto';
import { UuidValidationPipe } from '../../common/pipes';
import { ResponseUtil } from '../../shared/utils/response.util';
import { ApiResponse as CustomApiResponse } from '../../shared/types/response.types';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@ApiTags('Workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({
    summary: 'Create workspace',
    description: 'Create a new workspace and automatically become its admin',
  })
  @ApiBody({
    type: CreateWorkspaceDto,
    description: 'Workspace creation data',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Workspace created successfully',
    type: WorkspaceDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Workspace with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<WorkspaceDto>> {
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workspaces retrieved successfully',
    type: [WorkspaceDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findAll(
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<WorkspaceDto[]>> {
    const workspaces = await this.workspaceService.findAll(req.user.id);
    return ResponseUtil.success(
      workspaces,
      'Workspaces retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get workspace by ID',
    description: 'Retrieve workspace details by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workspace retrieved successfully',
    type: WorkspaceDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this workspace',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findOne(
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<WorkspaceDto>> {
    const workspace = await this.workspaceService.findOne(id, req.user.id);
    return ResponseUtil.success(workspace, 'Workspace retrieved successfully');
  }

  @Patch(':id')
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workspace updated successfully',
    type: WorkspaceDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Workspace with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<WorkspaceDto>> {
    const workspace = await this.workspaceService.update(
      id,
      updateWorkspaceDto,
      req.user.id,
    );
    return ResponseUtil.updated(workspace, 'Workspace updated successfully');
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete workspace',
    description: 'Delete workspace (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workspace deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete workspace. You are the only admin.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async remove(
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<null>> {
    await this.workspaceService.remove(id, req.user.id);
    return ResponseUtil.deleted('Workspace deleted successfully');
  }

  // Membership management endpoints

  @Get(':id/members')
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Members retrieved successfully',
    type: WorkspaceMembersListDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this workspace',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async getMembers(
    @Param('id', UuidValidationPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<WorkspaceMembersListDto>> {
    const members = await this.workspaceService.getMembers(
      id,
      req.user.id,
      page,
      limit,
    );
    return ResponseUtil.success(members, 'Members retrieved successfully');
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Invite member',
    description: 'Invite a user to join the workspace (admin only)',
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
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Member invited successfully',
    type: WorkspaceMemberDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace or user not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User is already a member of this workspace',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async inviteMember(
    @Param('id', UuidValidationPipe) id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<WorkspaceMemberDto>> {
    const member = await this.workspaceService.inviteMember(
      id,
      inviteMemberDto,
      req.user.id,
    );
    return ResponseUtil.created(member, 'Member invited successfully');
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({
    summary: 'Update member',
    description: 'Update member role or status (admin only)',
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Member updated successfully',
    type: WorkspaceMemberDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace or membership not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot modify your own membership or remove last admin',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateMember(
    @Param('id', UuidValidationPipe) id: string,
    @Param('memberId', UuidValidationPipe) memberId: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<WorkspaceMemberDto>> {
    const member = await this.workspaceService.updateMembership(
      id,
      memberId,
      updateMembershipDto,
      req.user.id,
    );
    return ResponseUtil.updated(member, 'Member updated successfully');
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({
    summary: 'Remove member',
    description: 'Remove a member from the workspace (admin only)',
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace or membership not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have admin access to this workspace',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot remove yourself or the only admin',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async removeMember(
    @Param('id', UuidValidationPipe) id: string,
    @Param('memberId', UuidValidationPipe) memberId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomApiResponse<null>> {
    await this.workspaceService.removeMember(id, memberId, req.user.id);
    return ResponseUtil.deleted('Member removed successfully');
  }
}
