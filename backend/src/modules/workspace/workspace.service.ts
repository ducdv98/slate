import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Workspace, Membership, User } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
  WorkspaceMemberDto,
  InviteMemberDto,
  UpdateMembershipDto,
  WorkspaceMembersListDto,
  MembershipRole,
  MembershipStatus,
  BillingTier,
} from './dto';
import { PermissionService } from './services/permission.service';
import { WorkspacePermission } from '../../shared/constants/permissions.constants';
import { AuditLogService } from '../../shared/services/audit-log.service';
import { AuditAction } from '../../shared/types/audit.types';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    userId: string,
  ): Promise<WorkspaceDto> {
    const { name, description } = createWorkspaceDto;

    // Check if user already has a workspace with the same name
    const existingWorkspace = await this.prisma.workspace.findFirst({
      where: {
        name,
        memberships: {
          some: {
            userId,
            status: MembershipStatus.ACTIVE,
          },
        },
      },
    });

    if (existingWorkspace) {
      throw new ConflictException('Workspace with this name already exists');
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        description,
        billingTier: BillingTier.FREE, // Always default to FREE tier
        memberships: {
          create: {
            userId,
            role: MembershipRole.ADMIN,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
          },
        },
      },
      include: {
        memberships: {
          where: { userId },
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            memberships: {
              where: { status: MembershipStatus.ACTIVE },
            },
            projects: true,
          },
        },
      },
    });

    // Log workspace creation
    await this.auditLogService.logWorkspaceAction(
      AuditAction.WORKSPACE_CREATE,
      workspace.id,
      userId,
      workspace.id,
    );

    return this.mapWorkspaceToDto(workspace, workspace.memberships[0]);
  }

  async findAll(userId: string): Promise<WorkspaceDto[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        memberships: {
          some: {
            userId,
            status: MembershipStatus.ACTIVE,
          },
        },
      },
      include: {
        memberships: {
          where: { userId },
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            memberships: {
              where: { status: MembershipStatus.ACTIVE },
            },
            projects: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workspaces.map((workspace) =>
      this.mapWorkspaceToDto(workspace, workspace.memberships[0]),
    );
  }

  async findOne(id: string, userId: string): Promise<WorkspaceDto> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { userId },
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            memberships: {
              where: { status: MembershipStatus.ACTIVE },
            },
            projects: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.memberships.length === 0) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    await this.auditLogService.logWorkspaceAction(
      AuditAction.WORKSPACE_UPDATE, // Using update action for view tracking
      id,
      userId,
      id,
    );

    return this.mapWorkspaceToDto(workspace, workspace.memberships[0]);
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
    userId: string,
  ): Promise<WorkspaceDto> {
    // Check if user has admin access to the workspace
    await this.validateAdminAccess(id, userId);

    // If name is being updated, check for conflicts
    if (updateWorkspaceDto.name) {
      const existingWorkspace = await this.prisma.workspace.findFirst({
        where: {
          name: updateWorkspaceDto.name,
          id: { not: id },
          memberships: {
            some: {
              userId,
              status: MembershipStatus.ACTIVE,
            },
          },
        },
      });

      if (existingWorkspace) {
        throw new ConflictException('Workspace with this name already exists');
      }
    }

    const workspace = await this.prisma.workspace.update({
      where: { id },
      data: updateWorkspaceDto,
      include: {
        memberships: {
          where: { userId },
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            memberships: {
              where: { status: MembershipStatus.ACTIVE },
            },
            projects: true,
          },
        },
      },
    });

    await this.auditLogService.logWorkspaceAction(
      AuditAction.WORKSPACE_UPDATE,
      id,
      userId,
      id,
    );

    return this.mapWorkspaceToDto(workspace, workspace.memberships[0]);
  }

  async remove(id: string, userId: string): Promise<void> {
    // Check if user has permission to delete workspace
    const hasDeletePermission = await this.permissionService.hasPermission(
      userId,
      id,
      WorkspacePermission.DELETE_WORKSPACE,
    );

    if (!hasDeletePermission) {
      throw new ForbiddenException(
        'You do not have permission to delete this workspace',
      );
    }

    // Check if this is the only admin (still need this business rule)
    const adminCount = await this.prisma.membership.count({
      where: {
        workspaceId: id,
        role: MembershipRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (adminCount === 1) {
      throw new BadRequestException(
        'Cannot delete workspace. You are the only admin. Please assign another admin first.',
      );
    }

    await this.prisma.workspace.delete({
      where: { id },
    });

    await this.auditLogService.logWorkspaceAction(
      AuditAction.WORKSPACE_DELETE,
      id,
      userId,
      id,
    );
  }

  // Membership management methods

  async getMembers(
    workspaceId: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<WorkspaceMembersListDto> {
    // Check if user has access to the workspace
    await this.validateWorkspaceAccess(workspaceId, userId);

    const offset = (page - 1) * limit;

    const [members, total] = await Promise.all([
      this.prisma.membership.findMany({
        where: { workspaceId },
        include: {
          user: true,
          invitedByUser: true,
        },
        orderBy: [
          { role: 'asc' }, // Admins first
          { joinedAt: 'asc' },
        ],
        skip: offset,
        take: limit,
      }),
      this.prisma.membership.count({
        where: { workspaceId },
      }),
    ]);

    return {
      members: members.map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        avatarUrl: membership.user.avatarUrl || undefined,
        role: membership.role as MembershipRole,
        status: membership.status as MembershipStatus,
        joinedAt: membership.joinedAt || membership.invitedAt || new Date(),
        invitedAt: membership.invitedAt || undefined,
        invitedBy: membership.invitedByUser
          ? {
              id: membership.invitedByUser.id,
              name: membership.invitedByUser.name,
              email: membership.invitedByUser.email,
            }
          : undefined,
      })),
      total,
    };
  }

  async inviteMember(
    workspaceId: string,
    inviteMemberDto: InviteMemberDto,
    userId: string,
  ): Promise<WorkspaceMemberDto> {
    // Check if user has admin access
    await this.validateAdminAccess(workspaceId, userId);

    const { email, role = MembershipRole.MEMBER } = inviteMemberDto;

    // Find the user by email
    const invitedUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      throw new NotFoundException('User with this email does not exist');
    }

    // Check if user is already a member
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: invitedUser.id,
          workspaceId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this workspace');
    }

    const membership = await this.prisma.membership.create({
      data: {
        userId: invitedUser.id,
        workspaceId,
        role,
        status: MembershipStatus.ACTIVE, // For MVP, auto-accept invites
        invitedBy: userId,
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    await this.auditLogService.logWorkspaceAction(
      AuditAction.WORKSPACE_MEMBER_INVITE,
      workspaceId,
      userId,
      membership.id,
    );

    return {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      avatarUrl: membership.user.avatarUrl || undefined,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt || new Date(),
    };
  }

  async updateMembership(
    workspaceId: string,
    memberId: string,
    updateMembershipDto: UpdateMembershipDto,
    userId: string,
  ): Promise<WorkspaceMemberDto> {
    // Check if user has admin access
    await this.validateAdminAccess(workspaceId, userId);

    // Don't allow user to modify their own membership
    if (memberId === userId) {
      throw new BadRequestException('You cannot modify your own membership');
    }

    // Check if membership exists
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // If removing admin role, ensure at least one admin remains
    if (
      updateMembershipDto.role &&
      membership.role === MembershipRole.ADMIN &&
      updateMembershipDto.role !== MembershipRole.ADMIN
    ) {
      const adminCount = await this.prisma.membership.count({
        where: {
          workspaceId,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      });

      if (adminCount === 1) {
        throw new BadRequestException(
          'Cannot remove admin role. At least one admin must remain.',
        );
      }
    }

    const updatedMembership = await this.prisma.membership.update({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
      data: updateMembershipDto,
      include: {
        user: true,
      },
    });

    await this.auditLogService.logWorkspaceAction(
      AuditAction.WORKSPACE_MEMBER_ROLE_UPDATE,
      workspaceId,
      userId,
      updatedMembership.id,
    );

    return {
      id: updatedMembership.user.id,
      name: updatedMembership.user.name,
      email: updatedMembership.user.email,
      avatarUrl: updatedMembership.user.avatarUrl || undefined,
      role: updatedMembership.role,
      status: updatedMembership.status,
      joinedAt: updatedMembership.joinedAt || new Date(),
    };
  }

  async removeMember(
    workspaceId: string,
    memberId: string,
    userId: string,
  ): Promise<void> {
    // Check if user has admin access
    await this.validateAdminAccess(workspaceId, userId);

    // Don't allow user to remove themselves
    if (memberId === userId) {
      throw new BadRequestException(
        'You cannot remove yourself from the workspace',
      );
    }

    // Check if membership exists
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // If removing an admin, ensure at least one admin remains
    if (membership.role === MembershipRole.ADMIN) {
      const adminCount = await this.prisma.membership.count({
        where: {
          workspaceId,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      });

      if (adminCount === 1) {
        throw new BadRequestException(
          'Cannot remove the only admin. Please assign another admin first.',
        );
      }
    }

    await this.prisma.membership.delete({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
    });

    await this.auditLogService.logWorkspaceAction(
      AuditAction.WORKSPACE_MEMBER_REMOVE,
      workspaceId,
      userId,
      membership.id,
    );
  }

  // Private helper methods

  private async validateWorkspaceAccess(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }

  private async validateAdminAccess(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have admin access to this workspace',
      );
    }
  }

  private mapWorkspaceToDto(
    workspace: Workspace & {
      memberships: Array<
        Membership & {
          user: User;
        }
      >;
      _count: {
        memberships: number;
        projects: number;
      };
    },
    currentUserMembership?: Membership & { user: User },
  ): WorkspaceDto {
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description || undefined,
      createdAt: workspace.createdAt,
      billingTier: workspace.billingTier as BillingTier,
      currentUserMembership: currentUserMembership
        ? {
            id: currentUserMembership.user.id,
            name: currentUserMembership.user.name,
            email: currentUserMembership.user.email,
            avatarUrl: currentUserMembership.user.avatarUrl || undefined,
            role: currentUserMembership.role,
            status: currentUserMembership.status,
            joinedAt: currentUserMembership.joinedAt || new Date(),
          }
        : undefined,
      memberCount: workspace._count.memberships,
      projectCount: workspace._count.projects,
    };
  }
}
