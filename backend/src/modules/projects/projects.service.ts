import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { PermissionService } from '../workspace/services/permission.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import { AuditAction, AuditTargetType } from '../../shared/types/audit.types';
import { CustomFieldValidationService } from '../../shared/services/custom-field-validation.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectDto,
  ProjectListDto,
  CustomFieldDefinitionDto,
  CustomFieldValueDto,
  ProjectCustomFieldsDto,
} from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly auditLogService: AuditLogService,
    private readonly customFieldValidationService: CustomFieldValidationService,
  ) {}

  async create(
    workspaceId: string,
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectDto> {
    // Verify workspace exists and user has access
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // Check for duplicate project name within workspace
    const existingProject = await this.prisma.project.findFirst({
      where: {
        workspaceId,
        name: createProjectDto.name,
      },
    });

    if (existingProject) {
      throw new ConflictException(
        'A project with this name already exists in the workspace',
      );
    }

    // Validate dates if provided
    if (createProjectDto.startDate && createProjectDto.targetDate) {
      const startDate = new Date(createProjectDto.startDate);
      const targetDate = new Date(createProjectDto.targetDate);

      if (startDate >= targetDate) {
        throw new BadRequestException('Target date must be after start date');
      }
    }

    // Create project
    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: createProjectDto.name,
        description: createProjectDto.description,
        startDate: createProjectDto.startDate
          ? new Date(createProjectDto.startDate)
          : null,
        targetDate: createProjectDto.targetDate
          ? new Date(createProjectDto.targetDate)
          : null,
        customFields: createProjectDto.customFields
          ? JSON.parse(JSON.stringify(createProjectDto.customFields))
          : null,
        progress: 0, // Initialize progress to 0
      },
    });

    // Log audit event
    await this.auditLogService.logAction(
      AuditAction.PROJECT_CREATE,
      AuditTargetType.PROJECT,
      project.id,
      workspaceId,
      userId,
      {
        name: { after: project.name },
        description: { after: project.description },
      },
    );

    return this.transformToDto(project, 0, 0, []);
  }

  async findAll(
    workspaceId: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ProjectListDto> {
    // Verify workspace access
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const skip = (page - 1) * limit;

    // Get projects with issue counts
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { workspaceId },
        include: {
          _count: {
            select: {
              issues: true,
              milestones: true,
            },
          },
          issues: {
            select: {
              status: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({
        where: { workspaceId },
      }),
    ]);

    const projectDtos = projects.map((project) =>
      this.transformToDto(
        project,
        project._count.issues,
        project._count.milestones,
        project.issues,
      ),
    );

    return {
      data: projectDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDto> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      include: {
        _count: {
          select: {
            issues: true,
            milestones: true,
          },
        },
        issues: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.transformToDto(
      project,
      project._count.issues,
      project._count.milestones,
      project.issues,
    );
  }

  async update(
    workspaceId: string,
    projectId: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<ProjectDto> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // Verify project exists and belongs to workspace
    const existingProject = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    // Check for name conflicts if name is being updated
    if (
      updateProjectDto.name &&
      updateProjectDto.name !== existingProject.name
    ) {
      const duplicateProject = await this.prisma.project.findFirst({
        where: {
          workspaceId,
          name: updateProjectDto.name,
          id: { not: projectId },
        },
      });

      if (duplicateProject) {
        throw new ConflictException(
          'A project with this name already exists in the workspace',
        );
      }
    }

    // Validate dates if provided
    const startDate = updateProjectDto.startDate
      ? new Date(updateProjectDto.startDate)
      : existingProject.startDate;
    const targetDate = updateProjectDto.targetDate
      ? new Date(updateProjectDto.targetDate)
      : existingProject.targetDate;

    if (startDate && targetDate && startDate >= targetDate) {
      throw new BadRequestException('Target date must be after start date');
    }

    // Prepare update data and changes for audit
    const updateData: Record<string, any> = {};
    const changes: Record<string, { before?: any; after?: any }> = {};

    if (updateProjectDto.name !== undefined) {
      updateData.name = updateProjectDto.name;
      changes.name = {
        before: existingProject.name,
        after: updateProjectDto.name,
      };
    }
    if (updateProjectDto.description !== undefined) {
      updateData.description = updateProjectDto.description;
      changes.description = {
        before: existingProject.description,
        after: updateProjectDto.description,
      };
    }
    if (updateProjectDto.startDate !== undefined) {
      updateData.startDate = updateProjectDto.startDate
        ? new Date(updateProjectDto.startDate)
        : null;
      changes.startDate = {
        before: existingProject.startDate,
        after: updateData.startDate,
      };
    }
    if (updateProjectDto.targetDate !== undefined) {
      updateData.targetDate = updateProjectDto.targetDate
        ? new Date(updateProjectDto.targetDate)
        : null;
      changes.targetDate = {
        before: existingProject.targetDate,
        after: updateData.targetDate,
      };
    }
    if (updateProjectDto.customFields !== undefined) {
      updateData.customFields = updateProjectDto.customFields;
      changes.customFields = {
        before: existingProject.customFields,
        after: updateProjectDto.customFields,
      };
    }

    // Update project
    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        _count: {
          select: {
            issues: true,
            milestones: true,
          },
        },
        issues: {
          select: {
            status: true,
          },
        },
      },
    });

    // Log audit event
    await this.auditLogService.logAction(
      AuditAction.PROJECT_UPDATE,
      AuditTargetType.PROJECT,
      projectId,
      workspaceId,
      userId,
      changes,
    );

    return this.transformToDto(
      updatedProject,
      updatedProject._count.issues,
      updatedProject._count.milestones,
      updatedProject.issues,
    );
  }

  async remove(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // Verify project exists and belongs to workspace
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      include: {
        _count: {
          select: {
            issues: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if project has issues - optionally prevent deletion
    if (project._count.issues > 0) {
      throw new BadRequestException(
        'Cannot delete project that contains issues. Please move or delete all issues first.',
      );
    }

    // Delete project (cascade will handle milestones)
    await this.prisma.project.delete({
      where: { id: projectId },
    });

    // Log audit event
    await this.auditLogService.logAction(
      AuditAction.PROJECT_DELETE,
      AuditTargetType.PROJECT,
      projectId,
      workspaceId,
      userId,
      {
        name: { before: project.name },
      },
    );
  }

  async calculateProgress(projectId: string): Promise<number> {
    const issueStats = await this.prisma.issue.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true,
    });

    const totalIssues = issueStats.reduce((sum, stat) => sum + stat._count, 0);

    if (totalIssues === 0) {
      return 0;
    }

    const completedIssues = issueStats
      .filter((stat) => stat.status === 'done')
      .reduce((sum, stat) => sum + stat._count, 0);

    return Math.round((completedIssues / totalIssues) * 100 * 100) / 100; // Round to 2 decimal places
  }

  async updateProgress(projectId: string): Promise<void> {
    const progress = await this.calculateProgress(projectId);

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });
  }

  private async verifyWorkspaceAccess(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        workspaceId,
        status: 'active',
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }

  private transformToDto(
    project: any,
    issueCount: number,
    milestoneCount: number,
    issues: Array<{ status: string }>,
  ): ProjectDto {
    const completedIssueCount = issues
      ? issues.filter((issue) => issue.status === 'done').length
      : 0;

    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      startDate: project.startDate?.toISOString().split('T')[0],
      targetDate: project.targetDate?.toISOString().split('T')[0],
      progress: project.progress,
      customFields: project.customFields,
      createdAt: project.createdAt,
      issueCount,
      completedIssueCount,
      milestoneCount,
    };
  }

  // Custom Field Management Methods

  async getCustomFieldDefinitions(
    workspaceId: string,
    userId: string,
  ): Promise<CustomFieldDefinitionDto[]> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // For now, return empty array - we'll store definitions in database later
    // This is a placeholder for the basic implementation
    return [];
  }

  async createCustomFieldDefinition(
    workspaceId: string,
    definition: CustomFieldDefinitionDto,
    userId: string,
  ): Promise<CustomFieldDefinitionDto> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // Validate the field definition
    this.customFieldValidationService.validateFieldDefinition(
      definition as any,
    );

    // For now, just return the definition - we'll store in database later
    // This is a placeholder for the basic implementation
    return definition;
  }

  async updateCustomFieldDefinition(
    workspaceId: string,
    fieldId: string,
    definition: Partial<CustomFieldDefinitionDto>,
    userId: string,
  ): Promise<CustomFieldDefinitionDto> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // For now, just return the updated definition - we'll store in database later
    if (!definition.id) {
      definition.id = fieldId;
    }

    return definition as CustomFieldDefinitionDto;
  }

  async deleteCustomFieldDefinition(
    workspaceId: string,
    fieldId: string,
    userId: string,
  ): Promise<void> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // For now, this is a placeholder - we'll remove from database later
    // In a real implementation, we would:
    // 1. Find the field definition
    // 2. Remove all values for this field from all projects
    // 3. Delete the field definition
  }

  async getProjectCustomFields(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectCustomFieldsDto> {
    const project = await this.findOne(workspaceId, projectId, userId);

    return {
      definitions: await this.getCustomFieldDefinitions(workspaceId, userId),
      values: project.customFields || [],
    };
  }

  async updateProjectCustomFields(
    workspaceId: string,
    projectId: string,
    customFields: CustomFieldValueDto[],
    userId: string,
  ): Promise<CustomFieldValueDto[]> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // Verify project exists
    const existingProject = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    // Get field definitions for validation
    const definitions = await this.getCustomFieldDefinitions(
      workspaceId,
      userId,
    );

    // Validate each custom field value
    for (const fieldValue of customFields) {
      const definition = definitions.find((d) => d.id === fieldValue.fieldId);
      if (definition) {
        this.customFieldValidationService.validateFieldValue(
          definition as any,
          fieldValue.value,
        );
      }
    }

    // Update project with new custom field values
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        customFields: JSON.parse(JSON.stringify(customFields)),
      },
    });

    // Log audit event
    await this.auditLogService.logAction(
      AuditAction.PROJECT_UPDATE,
      AuditTargetType.PROJECT,
      projectId,
      workspaceId,
      userId,
      {
        customFields: {
          before: existingProject.customFields,
          after: customFields,
        },
      },
    );

    return customFields;
  }
}
