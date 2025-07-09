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
  CanViewProjects,
  CanCreateProjects,
  CanUpdateProjects,
  CanDeleteProjects,
  CanViewCustomFields,
  CanCreateCustomFields,
  CanUpdateCustomFields,
  CanDeleteCustomFields,
} from '../../common/decorators/workspace-permissions.decorator';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectDto,
  ProjectListDto,
  CustomFieldDefinitionDto,
  CustomFieldValueDto,
  ProjectCustomFieldsDto,
} from './dto';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ApiResponse } from '../../shared/types/response.types';
import { ResponseUtil } from '../../shared/utils/response.util';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  ip?: string;
}

@ApiTags('Projects')
@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @CanCreateProjects()
  @ApiOperation({
    summary: 'Create project',
    description: 'Create a new project in the workspace',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiBody({
    type: CreateProjectDto,
    description: 'Project creation data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CREATED,
    description: 'Project created successfully',
    type: ProjectDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.CONFLICT,
    description: 'Project with this name already exists in workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to create projects',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid project data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async create(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<ProjectDto>> {
    const project = await this.projectsService.create(
      workspaceId,
      createProjectDto,
      req.user.id,
    );
    return ResponseUtil.created(project, 'Project created successfully');
  }

  @Get()
  @CanViewProjects()
  @ApiOperation({
    summary: 'Get projects',
    description: 'Retrieve paginated list of projects in the workspace',
  })
  @ApiParam({
    name: 'workspaceId',
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
    description: 'Projects retrieved successfully',
    type: ProjectListDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view projects',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findAll(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<ProjectListDto>> {
    const projects = await this.projectsService.findAll(
      workspaceId,
      req.user.id,
      page,
      limit,
    );
    return ResponseUtil.success(projects, 'Projects retrieved successfully');
  }

  @Get(':id')
  @CanViewProjects()
  @ApiOperation({
    summary: 'Get project',
    description: 'Retrieve a specific project by ID',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Project retrieved successfully',
    type: ProjectDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view this project',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async findOne(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<ProjectDto>> {
    const project = await this.projectsService.findOne(
      workspaceId,
      id,
      req.user.id,
    );
    return ResponseUtil.success(project, 'Project retrieved successfully');
  }

  @Patch(':id')
  @CanUpdateProjects()
  @ApiOperation({
    summary: 'Update project',
    description: 'Update project details',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
  })
  @ApiBody({
    type: UpdateProjectDto,
    description: 'Project update data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Project updated successfully',
    type: ProjectDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CONFLICT,
    description: 'Project with this name already exists in workspace',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update this project',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid project data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async update(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<ProjectDto>> {
    const project = await this.projectsService.update(
      workspaceId,
      id,
      updateProjectDto,
      req.user.id,
    );
    return ResponseUtil.updated(project, 'Project updated successfully');
  }

  @Delete(':id')
  @CanDeleteProjects()
  @ApiOperation({
    summary: 'Delete project',
    description: 'Delete a project from the workspace',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Project deleted successfully',
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to delete this project',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete project with existing issues',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async remove(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<null>> {
    await this.projectsService.remove(workspaceId, id, req.user.id);
    return ResponseUtil.deleted('Project deleted successfully');
  }

  @Post(':id/update-progress')
  @CanUpdateProjects()
  @ApiOperation({
    summary: 'Update project progress',
    description:
      'Recalculate and update project progress based on issue completion',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Project progress updated successfully',
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update this project',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateProgress(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<null>> {
    // First verify the project exists and user has access
    await this.projectsService.findOne(workspaceId, id, req.user.id);

    // Update the progress
    await this.projectsService.updateProgress(id);

    return ResponseUtil.success(null, 'Project progress updated successfully');
  }

  // Custom Field Management Endpoints

  @Get('custom-fields/definitions')
  @CanViewCustomFields()
  @ApiOperation({
    summary: 'Get custom field definitions',
    description: 'Retrieve all custom field definitions for the workspace',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Custom field definitions retrieved successfully',
    type: [CustomFieldDefinitionDto],
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view custom fields',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async getCustomFieldDefinitions(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<CustomFieldDefinitionDto[]>> {
    const definitions = await this.projectsService.getCustomFieldDefinitions(
      workspaceId,
      req.user.id,
    );
    return ResponseUtil.success(
      definitions,
      'Custom field definitions retrieved successfully',
    );
  }

  @Post('custom-fields/definitions')
  @CanCreateCustomFields()
  @ApiOperation({
    summary: 'Create custom field definition',
    description: 'Create a new custom field definition for the workspace',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiBody({
    type: CustomFieldDefinitionDto,
    description: 'Custom field definition data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CREATED,
    description: 'Custom field definition created successfully',
    type: CustomFieldDefinitionDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid custom field definition data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.CONFLICT,
    description: 'Custom field with this name already exists',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to create custom fields',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async createCustomFieldDefinition(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Body() definition: CustomFieldDefinitionDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<CustomFieldDefinitionDto>> {
    const createdDefinition =
      await this.projectsService.createCustomFieldDefinition(
        workspaceId,
        definition,
        req.user.id,
      );
    return ResponseUtil.created(
      createdDefinition,
      'Custom field definition created successfully',
    );
  }

  @Patch('custom-fields/definitions/:fieldId')
  @CanUpdateCustomFields()
  @ApiOperation({
    summary: 'Update custom field definition',
    description: 'Update an existing custom field definition',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'fieldId',
    description: 'Custom field ID',
    type: String,
  })
  @ApiBody({
    type: CustomFieldDefinitionDto,
    description: 'Updated custom field definition data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Custom field definition updated successfully',
    type: CustomFieldDefinitionDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Custom field definition not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid custom field definition data',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update custom fields',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateCustomFieldDefinition(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('fieldId', UuidValidationPipe) fieldId: string,
    @Body() definition: Partial<CustomFieldDefinitionDto>,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<CustomFieldDefinitionDto>> {
    const updatedDefinition =
      await this.projectsService.updateCustomFieldDefinition(
        workspaceId,
        fieldId,
        definition,
        req.user.id,
      );
    return ResponseUtil.updated(
      updatedDefinition,
      'Custom field definition updated successfully',
    );
  }

  @Delete('custom-fields/definitions/:fieldId')
  @CanDeleteCustomFields()
  @ApiOperation({
    summary: 'Delete custom field definition',
    description: 'Delete a custom field definition and all its values',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'fieldId',
    description: 'Custom field ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Custom field definition deleted successfully',
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Custom field definition not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to delete custom fields',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async deleteCustomFieldDefinition(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('fieldId', UuidValidationPipe) fieldId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<null>> {
    await this.projectsService.deleteCustomFieldDefinition(
      workspaceId,
      fieldId,
      req.user.id,
    );
    return ResponseUtil.deleted('Custom field definition deleted successfully');
  }

  @Get(':id/custom-fields')
  @CanViewCustomFields()
  @ApiOperation({
    summary: 'Get project custom fields',
    description: 'Retrieve custom field values for a specific project',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Project custom fields retrieved successfully',
    type: ProjectCustomFieldsDto,
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view this project',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async getProjectCustomFields(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<ProjectCustomFieldsDto>> {
    const customFields = await this.projectsService.getProjectCustomFields(
      workspaceId,
      id,
      req.user.id,
    );
    return ResponseUtil.success(
      customFields,
      'Project custom fields retrieved successfully',
    );
  }

  @Patch(':id/custom-fields')
  @CanUpdateCustomFields()
  @ApiOperation({
    summary: 'Update project custom fields',
    description: 'Update custom field values for a specific project',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace ID',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
  })
  @ApiBody({
    type: [CustomFieldValueDto],
    description: 'Custom field values to update',
  })
  @ApiResponseDecorator({
    status: HttpStatus.OK,
    description: 'Project custom fields updated successfully',
    type: [CustomFieldValueDto],
  })
  @ApiResponseDecorator({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponseDecorator({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid custom field values',
  })
  @ApiResponseDecorator({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update this project',
  })
  @ApiResponseDecorator({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  async updateProjectCustomFields(
    @Param('workspaceId', UuidValidationPipe) workspaceId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() customFields: CustomFieldValueDto[],
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<CustomFieldValueDto[]>> {
    const updatedFields = await this.projectsService.updateProjectCustomFields(
      workspaceId,
      id,
      customFields,
      req.user.id,
    );
    return ResponseUtil.updated(
      updatedFields,
      'Project custom fields updated successfully',
    );
  }
}
