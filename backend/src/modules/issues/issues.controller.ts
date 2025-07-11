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
  ParseEnumPipe,
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
  CanViewIssues,
  CanCreateIssues,
  CanUpdateIssues,
  CanDeleteIssues,
  RequireWorkspacePermissions,
} from '../../common/decorators/workspace-permissions.decorator';
import { WorkspacePermission } from '../../shared/constants/permissions.constants';
import { IssuesService } from './issues.service';
import {
  CreateIssueDto,
  UpdateIssueDto,
  IssueDto,
  IssueListDto,
  IssuePriority,
  IssueStatus,
} from './dto';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ApiResponse } from '../../shared/types/response.types';
import { ResponseUtil } from '../../shared/utils/response.util';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  ip?: string;
}

@ApiTags('Issues')
@Controller('workspaces/:workspaceId/projects/:projectId/issues')
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@ApiBearerAuth()
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @CanCreateIssues()
  @ApiOperation({
    summary: 'Create issue',
    description: 'Create a new issue in the project',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiBody({
    type: CreateIssueDto,
    description: 'Issue creation data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CREATED,
    description: 'Issue created successfully',
    type: IssueDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid issue data or business rule violation',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to create issues',
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async create(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('projectId', UuidValidationPipe) projectId: string,
    @Body() createIssueDto: CreateIssueDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<IssueDto>> {
    const issue = await this.issuesService.create(
      workspaceId,
      projectId,
      createIssueDto,
      req.user.id,
    );
    return ResponseUtil.created(issue, 'Issue created successfully');
  }

  @Get()
  @CanViewIssues()
  @ApiOperation({
    summary: 'Get issues',
    description:
      'Retrieve paginated list of issues in the project with optional filters',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
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
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: IssueStatus,
    description: 'Filter by issue status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: IssuePriority,
    description: 'Filter by issue priority',
  })
  @ApiQuery({
    name: 'assigneeId',
    required: false,
    type: String,
    description: 'Filter by assignee user ID',
  })
  @ApiQuery({
    name: 'cycleId',
    required: false,
    type: String,
    description: 'Filter by cycle ID',
  })
  @ApiQuery({
    name: 'parentIssueId',
    required: false,
    type: String,
    description: 'Filter by parent issue ID (use "null" for root issues)',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Issues retrieved successfully',
    type: IssueListDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view issues',
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findAll(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('projectId', UuidValidationPipe) projectId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: IssueStatus,
    @Query('priority') priority?: IssuePriority,
    @Query('assigneeId') assigneeId?: string,
    @Query('cycleId') cycleId?: string,
    @Query('parentIssueId') parentIssueId?: string,
  ): Promise<ApiResponse<IssueListDto>> {
    // Validate limit
    const validatedLimit = Math.min(Math.max(limit, 1), 100);

    // Handle special case for parentIssueId
    let parentFilter: string | null | undefined;
    if (parentIssueId === 'null') {
      parentFilter = null;
    } else if (parentIssueId) {
      parentFilter = parentIssueId;
    }

    const issues = await this.issuesService.findAll(
      workspaceId,
      projectId,
      req.user.id,
      page,
      validatedLimit,
      status,
      priority,
      assigneeId,
      cycleId,
      parentFilter,
    );
    return ResponseUtil.success(issues, 'Issues retrieved successfully');
  }

  @Get(':id')
  @CanViewIssues()
  @ApiOperation({
    summary: 'Get issue',
    description: 'Retrieve a specific issue by ID',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Issue ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Issue retrieved successfully',
    type: IssueDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Issue not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view this issue',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findOne(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('projectId', UuidValidationPipe) projectId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<IssueDto>> {
    const issue = await this.issuesService.findOne(
      workspaceId,
      projectId,
      id,
      req.user.id,
    );
    return ResponseUtil.success(issue, 'Issue retrieved successfully');
  }

  @Patch(':id')
  @CanUpdateIssues()
  @ApiOperation({
    summary: 'Update issue',
    description: 'Update issue details',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Issue ID',
    type: String,
  })
  @ApiBody({
    type: UpdateIssueDto,
    description: 'Issue update data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Issue updated successfully',
    type: IssueDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Issue not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid issue data or business rule violation',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update this issue',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async update(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('projectId', UuidValidationPipe) projectId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() updateIssueDto: UpdateIssueDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<IssueDto>> {
    const issue = await this.issuesService.update(
      workspaceId,
      projectId,
      id,
      updateIssueDto,
      req.user.id,
    );
    return ResponseUtil.updated(issue, 'Issue updated successfully');
  }

  @Delete(':id')
  @CanDeleteIssues()
  @ApiOperation({
    summary: 'Delete issue',
    description: 'Delete an issue from the project (Admin only)',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Issue ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Issue deleted successfully',
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Issue not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to delete issues (Admin required)',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete issue with child issues',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async remove(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('projectId', UuidValidationPipe) projectId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<null>> {
    await this.issuesService.remove(workspaceId, projectId, id, req.user.id);
    return ResponseUtil.deleted('Issue deleted successfully');
  }

  @Patch(':id/status')
  @CanUpdateIssues()
  @ApiOperation({
    summary: 'Update issue status',
    description: 'Update only the status of an issue (convenience endpoint)',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Issue ID',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(IssueStatus),
          description: 'New issue status',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Issue status updated successfully',
    type: IssueDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Issue not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status value',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update this issue',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateStatus(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('projectId', UuidValidationPipe) projectId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body('status', new ParseEnumPipe(IssueStatus)) status: IssueStatus,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<IssueDto>> {
    const issue = await this.issuesService.update(
      workspaceId,
      projectId,
      id,
      { status },
      req.user.id,
    );
    return ResponseUtil.updated(issue, 'Issue status updated successfully');
  }

  @Patch(':id/assignee')
  @RequireWorkspacePermissions(
    WorkspacePermission.UPDATE_ISSUES,
    WorkspacePermission.ASSIGN_ISSUES,
  )
  @ApiOperation({
    summary: 'Update issue assignee',
    description:
      'Update only the assignee of an issue (requires both UPDATE_ISSUES and ASSIGN_ISSUES permissions)',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Issue ID',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assigneeId: {
          type: 'string',
          format: 'uuid',
          description: 'User ID to assign issue to (null to unassign)',
          nullable: true,
        },
      },
      required: ['assigneeId'],
    },
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Issue assignee updated successfully',
    type: IssueDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Issue not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid assignee or assignee not a workspace member',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description:
      'You do not have permission to assign issues (requires both UPDATE_ISSUES and ASSIGN_ISSUES permissions)',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateAssignee(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('projectId', UuidValidationPipe) projectId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body('assigneeId') assigneeId: string | null,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<IssueDto>> {
    const issue = await this.issuesService.update(
      workspaceId,
      projectId,
      id,
      { assigneeId },
      req.user.id,
    );
    return ResponseUtil.updated(issue, 'Issue assignee updated successfully');
  }
}
