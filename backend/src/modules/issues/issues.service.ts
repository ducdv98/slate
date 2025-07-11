import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditLogService } from '../../shared/services/audit-log.service';
import { AuditAction, AuditTargetType } from '../../shared/types/audit.types';
import { PermissionService } from '../workspace/services/permission.service';
import { WorkspacePermission } from '../../shared/constants/permissions.constants';
import {
  CreateIssueDto,
  UpdateIssueDto,
  IssueDto,
  IssueListDto,
  IssuePriority,
  IssueStatus,
} from './dto';

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly permissionService: PermissionService,
  ) {}

  async create(
    workspaceId: string,
    projectId: string,
    createIssueDto: CreateIssueDto,
    userId: string,
  ): Promise<IssueDto> {
    // Verify project exists and user has access to workspace
    await this.verifyProjectAccess(workspaceId, projectId, userId);

    // Validate assignee if provided and check assignment permissions
    if (createIssueDto.assigneeId) {
      await this.validateAssignmentPermissions(workspaceId, userId);
      await this.validateAssignee(workspaceId, createIssueDto.assigneeId);
    }

    // Validate cycle if provided
    if (createIssueDto.cycleId) {
      await this.validateCycle(workspaceId, createIssueDto.cycleId);
    }

    // Validate parent issue if provided
    if (createIssueDto.parentIssueId) {
      await this.validateParentIssue(
        projectId,
        createIssueDto.parentIssueId,
        userId,
      );
    }

    // Validate due date if provided
    if (createIssueDto.dueDate) {
      this.validateDueDate(createIssueDto.dueDate);
    }

    // Create issue
    const issue = await this.prisma.issue.create({
      data: {
        projectId,
        title: createIssueDto.title,
        description: createIssueDto.description,
        priority: createIssueDto.priority,
        status: createIssueDto.status || IssueStatus.TODO,
        assigneeId: createIssueDto.assigneeId,
        cycleId: createIssueDto.cycleId,
        parentIssueId: createIssueDto.parentIssueId,
        estimate: createIssueDto.estimate,
        storyPoints: createIssueDto.storyPoints,
        dueDate: createIssueDto.dueDate
          ? new Date(createIssueDto.dueDate)
          : null,
        createdBy: userId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: createIssueDto.metadata
          ? JSON.parse(JSON.stringify(createIssueDto.metadata))
          : null,
      },
      include: this.getIssueIncludes(),
    });

    // Log audit event
    await this.auditLogService.logAction(
      AuditAction.ISSUE_CREATE,
      AuditTargetType.ISSUE,
      issue.id,
      workspaceId,
      userId,
      {
        title: { after: issue.title },
        priority: { after: issue.priority as string },
        status: { after: issue.status as string },
        assigneeId: { after: issue.assigneeId },
      },
    );

    // Update project progress asynchronously
    this.updateProjectProgress(projectId).catch((error) => {
      console.error('Failed to update project progress:', error);
    });

    return this.transformToDto(issue);
  }

  async findAll(
    workspaceId: string,
    projectId: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: IssueStatus,
    priority?: IssuePriority,
    assigneeId?: string,
    cycleId?: string,
    parentIssueId?: string,
  ): Promise<IssueListDto> {
    // Verify project access
    await this.verifyProjectAccess(workspaceId, projectId, userId);

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = { projectId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assigneeId) whereClause.assigneeId = assigneeId;
    if (cycleId) whereClause.cycleId = cycleId;
    if (parentIssueId !== undefined) {
      whereClause.parentIssueId = parentIssueId || null;
    }

    // Get issues with counts
    const [issues, total] = await Promise.all([
      this.prisma.issue.findMany({
        where: whereClause,
        include: this.getIssueIncludes(),
        orderBy: [
          { priority: 'desc' }, // urgent > high > medium > low
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.issue.count({
        where: whereClause,
      }),
    ]);

    const issueDtos = issues.map((issue) => this.transformToDto(issue));

    return {
      data: issueDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    workspaceId: string,
    projectId: string,
    issueId: string,
    userId: string,
  ): Promise<IssueDto> {
    // Verify project access
    await this.verifyProjectAccess(workspaceId, projectId, userId);

    const issue = await this.prisma.issue.findFirst({
      where: {
        id: issueId,
        projectId,
      },
      include: this.getIssueIncludes(),
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return this.transformToDto(issue);
  }

  async update(
    workspaceId: string,
    projectId: string,
    issueId: string,
    updateIssueDto: UpdateIssueDto,
    userId: string,
  ): Promise<IssueDto> {
    // Verify project access
    await this.verifyProjectAccess(workspaceId, projectId, userId);

    // Verify issue exists and belongs to project
    const existingIssue = await this.prisma.issue.findFirst({
      where: {
        id: issueId,
        projectId,
      },
    });

    if (!existingIssue) {
      throw new NotFoundException('Issue not found');
    }

    // RBAC: Check assignment permissions if assignee is being changed
    if (updateIssueDto.assigneeId !== undefined) {
      await this.validateAssignmentPermissions(workspaceId, userId);
    }

    // Validate assignee if being updated
    if (
      updateIssueDto.assigneeId !== undefined &&
      updateIssueDto.assigneeId !== null
    ) {
      await this.validateAssignee(workspaceId, updateIssueDto.assigneeId);
    }

    // Validate cycle if being updated
    if (
      updateIssueDto.cycleId !== undefined &&
      updateIssueDto.cycleId !== null
    ) {
      await this.validateCycle(workspaceId, updateIssueDto.cycleId);
    }

    // Validate parent issue if being updated
    if (
      updateIssueDto.parentIssueId !== undefined &&
      updateIssueDto.parentIssueId !== null
    ) {
      await this.validateParentIssue(
        projectId,
        updateIssueDto.parentIssueId,
        userId,
        issueId,
      );
    }

    // Validate due date if being updated
    if (updateIssueDto.dueDate) {
      this.validateDueDate(updateIssueDto.dueDate);
    }

    // Prepare update data and changes for audit
    const updateData: Record<string, unknown> = {};
    const changes: Record<string, { before?: unknown; after?: unknown }> = {};

    // Track changes for audit logging
    if (updateIssueDto.title !== undefined) {
      updateData.title = updateIssueDto.title;
      changes.title = {
        before: existingIssue.title,
        after: updateIssueDto.title,
      };
    }
    if (updateIssueDto.description !== undefined) {
      updateData.description = updateIssueDto.description;
      changes.description = {
        before: existingIssue.description,
        after: updateIssueDto.description,
      };
    }
    if (updateIssueDto.priority !== undefined) {
      updateData.priority = updateIssueDto.priority;
      changes.priority = {
        before: existingIssue.priority,
        after: updateIssueDto.priority,
      };
    }
    if (updateIssueDto.status !== undefined) {
      updateData.status = updateIssueDto.status;
      changes.status = {
        before: existingIssue.status,
        after: updateIssueDto.status,
      };
    }
    if (updateIssueDto.assigneeId !== undefined) {
      updateData.assigneeId = updateIssueDto.assigneeId;
      changes.assigneeId = {
        before: existingIssue.assigneeId,
        after: updateIssueDto.assigneeId,
      };
    }
    if (updateIssueDto.cycleId !== undefined) {
      updateData.cycleId = updateIssueDto.cycleId;
      changes.cycleId = {
        before: existingIssue.cycleId,
        after: updateIssueDto.cycleId,
      };
    }
    if (updateIssueDto.parentIssueId !== undefined) {
      updateData.parentIssueId = updateIssueDto.parentIssueId;
      changes.parentIssueId = {
        before: existingIssue.parentIssueId,
        after: updateIssueDto.parentIssueId,
      };
    }
    if (updateIssueDto.estimate !== undefined) {
      updateData.estimate = updateIssueDto.estimate;
      changes.estimate = {
        before: existingIssue.estimate,
        after: updateIssueDto.estimate,
      };
    }
    if (updateIssueDto.storyPoints !== undefined) {
      updateData.storyPoints = updateIssueDto.storyPoints;
      changes.storyPoints = {
        before: existingIssue.storyPoints,
        after: updateIssueDto.storyPoints,
      };
    }
    if (updateIssueDto.dueDate !== undefined) {
      updateData.dueDate = updateIssueDto.dueDate
        ? new Date(updateIssueDto.dueDate)
        : null;
      changes.dueDate = {
        before: existingIssue.dueDate,
        after: updateData.dueDate,
      };
    }
    if (updateIssueDto.metadata !== undefined) {
      updateData.metadata = updateIssueDto.metadata;
      changes.metadata = {
        before: existingIssue.metadata,
        after: updateIssueDto.metadata,
      };
    }

    // Update issue
    const updatedIssue = await this.prisma.issue.update({
      where: { id: issueId },
      data: updateData,
      include: this.getIssueIncludes(),
    });

    // Log audit events
    if (Object.keys(changes).length > 0) {
      await this.auditLogService.logAction(
        AuditAction.ISSUE_UPDATE,
        AuditTargetType.ISSUE,
        issueId,
        workspaceId,
        userId,
        changes,
      );
    }

    // Log specific events for important changes
    if (changes.status) {
      await this.auditLogService.logAction(
        AuditAction.ISSUE_STATUS_CHANGE,
        AuditTargetType.ISSUE,
        issueId,
        workspaceId,
        userId,
        { status: changes.status },
      );
    }

    if (changes.assigneeId) {
      await this.auditLogService.logAction(
        AuditAction.ISSUE_ASSIGN,
        AuditTargetType.ISSUE,
        issueId,
        workspaceId,
        userId,
        { assigneeId: changes.assigneeId },
      );
    }

    // Update project progress if status changed
    if (changes.status) {
      this.updateProjectProgress(projectId).catch((error) => {
        console.error('Failed to update project progress:', error);
      });
    }

    return this.transformToDto(updatedIssue);
  }

  async remove(
    workspaceId: string,
    projectId: string,
    issueId: string,
    userId: string,
  ): Promise<void> {
    // Verify project access
    await this.verifyProjectAccess(workspaceId, projectId, userId);

    // RBAC: Ensure user has delete permissions (typically admin-only)
    await this.validateDeletePermissions(workspaceId, userId);

    // Verify issue exists and belongs to project
    const issue = await this.prisma.issue.findFirst({
      where: {
        id: issueId,
        projectId,
      },
      include: {
        childIssues: true,
      },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    // Check if issue has child issues
    if (issue.childIssues.length > 0) {
      throw new BadRequestException(
        'Cannot delete issue that has child issues. Please move or delete child issues first.',
      );
    }

    // Delete issue (cascade will handle comments and attachments)
    await this.prisma.issue.delete({
      where: { id: issueId },
    });

    // Log audit event
    await this.auditLogService.logAction(
      AuditAction.ISSUE_DELETE,
      AuditTargetType.ISSUE,
      issueId,
      workspaceId,
      userId,
      {
        title: { before: issue.title },
        status: { before: issue.status },
      },
    );

    // Update project progress
    this.updateProjectProgress(projectId).catch((error) => {
      console.error('Failed to update project progress:', error);
    });
  }

  // Helper Methods

  private async verifyProjectAccess(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    // Check workspace membership
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

    // Check project exists and belongs to workspace
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async validateAssignmentPermissions(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const hasPermission = await this.permissionService.hasPermission(
      userId,
      workspaceId,
      WorkspacePermission.ASSIGN_ISSUES,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to assign issues. ASSIGN_ISSUES permission required.',
      );
    }
  }

  private async validateDeletePermissions(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const hasPermission = await this.permissionService.hasPermission(
      userId,
      workspaceId,
      WorkspacePermission.DELETE_ISSUES,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to delete issues. Only workspace administrators can delete issues.',
      );
    }
  }

  private async validateAssignee(
    workspaceId: string,
    assigneeId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: assigneeId,
        workspaceId,
        status: 'active',
      },
    });

    if (!membership) {
      throw new BadRequestException(
        'Assignee is not a member of this workspace',
      );
    }
  }

  private async validateCycle(
    workspaceId: string,
    cycleId: string,
  ): Promise<void> {
    const cycle = await this.prisma.cycle.findFirst({
      where: {
        id: cycleId,
        workspaceId,
      },
    });

    if (!cycle) {
      throw new BadRequestException('Cycle not found in this workspace');
    }
  }

  private async validateParentIssue(
    projectId: string,
    parentIssueId: string,
    userId: string,
    currentIssueId?: string,
  ): Promise<void> {
    const parentIssue = await this.prisma.issue.findFirst({
      where: {
        id: parentIssueId,
        projectId, // Parent must be in same project
      },
    });

    if (!parentIssue) {
      throw new BadRequestException('Parent issue not found in this project');
    }

    // Prevent self-reference
    if (currentIssueId && parentIssueId === currentIssueId) {
      throw new BadRequestException('Issue cannot be its own parent');
    }

    // Prevent circular references (basic check)
    if (currentIssueId && parentIssue.parentIssueId === currentIssueId) {
      throw new BadRequestException(
        'Circular reference detected: parent issue is already a child of this issue',
      );
    }
  }

  private validateDueDate(dueDate: string): void {
    const due = new Date(dueDate);
    const now = new Date();

    // Allow setting due dates in the past (for historical data)
    // but warn if it's more than a year in the past
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    if (due < oneYearAgo) {
      throw new BadRequestException(
        'Due date cannot be more than a year in the past',
      );
    }
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    const issueStats = await this.prisma.issue.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true,
    });

    const totalIssues = issueStats.reduce((sum, stat) => sum + stat._count, 0);

    if (totalIssues === 0) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { progress: 0 },
      });
      return;
    }

    const completedIssues = issueStats
      .filter((stat) => stat.status === IssueStatus.DONE)
      .reduce((sum, stat) => sum + stat._count, 0);

    const progress =
      Math.round((completedIssues / totalIssues) * 100 * 100) / 100; // Round to 2 decimal places

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });
  }

  private getIssueIncludes() {
    return {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      cycle: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
      parentIssue: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          childIssues: true,
          comments: true,
          attachments: true,
        },
      },
    };
  }

  private transformToDto(issue: unknown): IssueDto {
    const issueData = issue as Record<string, unknown>;
    const assigneeData = issueData.assignee as
      | Record<string, unknown>
      | undefined;
    const projectData = issueData.project as
      | Record<string, unknown>
      | undefined;
    const cycleData = issueData.cycle as Record<string, unknown> | undefined;
    const parentIssueData = issueData.parentIssue as
      | Record<string, unknown>
      | undefined;
    const countData = issueData._count as Record<string, number> | undefined;

    return {
      id: issueData.id as string,
      projectId: issueData.projectId as string,
      title: issueData.title as string,
      description: issueData.description as string | undefined,
      priority: issueData.priority as IssuePriority,
      status: issueData.status as IssueStatus,
      estimate: issueData.estimate as number | undefined,
      storyPoints: issueData.storyPoints as number | undefined,
      dueDate: issueData.dueDate
        ? (issueData.dueDate as Date).toISOString().split('T')[0]
        : undefined,
      createdAt: issueData.createdAt as Date,
      updatedAt: issueData.updatedAt as Date,
      createdBy: issueData.createdBy as string,
      metadata: issueData.metadata as Record<string, unknown> | undefined,
      assignee: assigneeData
        ? {
            id: assigneeData.id as string,
            name: assigneeData.name as string,
            email: assigneeData.email as string | undefined,
            avatarUrl: assigneeData.avatarUrl as string | undefined,
          }
        : undefined,
      project: projectData
        ? {
            id: projectData.id as string,
            name: projectData.name as string,
          }
        : undefined,
      cycle: cycleData
        ? {
            id: cycleData.id as string,
            name: cycleData.name as string,
            startDate: cycleData.startDate
              ? (cycleData.startDate as Date).toISOString().split('T')[0]
              : undefined,
            endDate: cycleData.endDate
              ? (cycleData.endDate as Date).toISOString().split('T')[0]
              : undefined,
          }
        : undefined,
      parentIssue: parentIssueData
        ? {
            id: parentIssueData.id as string,
            title: parentIssueData.title as string,
          }
        : undefined,
      childIssueCount: countData?.childIssues || 0,
      commentCount: countData?.comments || 0,
      attachmentCount: countData?.attachments || 0,
    };
  }
}
