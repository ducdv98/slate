import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  WorkspacePermission,
  MembershipRole,
  ROLE_PERMISSIONS,
  PermissionOverride,
} from '../../../shared/constants/permissions.constants';

export interface UserWorkspacePermissions {
  role: MembershipRole;
  permissions: WorkspacePermission[];
  hasPermissionOverrides: boolean;
}

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's effective permissions in a workspace
   */
  async getUserPermissions(
    userId: string,
    workspaceId: string,
  ): Promise<UserWorkspacePermissions | null> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership || membership.status !== 'active') {
      return null;
    }

    const role = membership.role as MembershipRole;
    const basePermissions = ROLE_PERMISSIONS[role] || [];

    // Apply permission overrides if they exist
    let effectivePermissions = [...basePermissions];
    let hasPermissionOverrides = false;

    if (membership.permissionsOverride) {
      hasPermissionOverrides = true;
      const overrides = membership.permissionsOverride as PermissionOverride;

      // Add granted permissions
      if (overrides.granted) {
        effectivePermissions = [
          ...effectivePermissions,
          ...overrides.granted.filter((p) => !effectivePermissions.includes(p)),
        ];
      }

      // Remove revoked permissions
      if (overrides.revoked) {
        effectivePermissions = effectivePermissions.filter(
          (p) => !overrides.revoked.includes(p),
        );
      }
    }

    return {
      role,
      permissions: effectivePermissions,
      hasPermissionOverrides,
    };
  }

  /**
   * Check if a user has a specific permission in a workspace
   */
  async hasPermission(
    userId: string,
    workspaceId: string,
    permission: WorkspacePermission,
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, workspaceId);

    if (!userPermissions) {
      return false;
    }

    return userPermissions.permissions.includes(permission);
  }

  /**
   * Check if a user has any of the specified permissions in a workspace
   */
  async hasAnyPermission(
    userId: string,
    workspaceId: string,
    permissions: WorkspacePermission[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, workspaceId);

    if (!userPermissions) {
      return false;
    }

    return permissions.some((permission) =>
      userPermissions.permissions.includes(permission),
    );
  }

  /**
   * Check if a user has all of the specified permissions in a workspace
   */
  async hasAllPermissions(
    userId: string,
    workspaceId: string,
    permissions: WorkspacePermission[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, workspaceId);

    if (!userPermissions) {
      return false;
    }

    return permissions.every((permission) =>
      userPermissions.permissions.includes(permission),
    );
  }

  /**
   * Check if a user has a specific role in a workspace
   */
  async hasRole(
    userId: string,
    workspaceId: string,
    role: MembershipRole,
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, workspaceId);

    if (!userPermissions) {
      return false;
    }

    return userPermissions.role === role;
  }

  /**
   * Check if a user has any of the specified roles in a workspace
   */
  async hasAnyRole(
    userId: string,
    workspaceId: string,
    roles: MembershipRole[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, workspaceId);

    if (!userPermissions) {
      return false;
    }

    return roles.includes(userPermissions.role);
  }

  /**
   * Check if a user has minimum role level (role hierarchy check)
   */
  async hasMinimumRole(
    userId: string,
    workspaceId: string,
    minimumRole: MembershipRole,
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, workspaceId);

    if (!userPermissions) {
      return false;
    }

    const roleHierarchy = {
      [MembershipRole.GUEST]: 0,
      [MembershipRole.MEMBER]: 1,
      [MembershipRole.ADMIN]: 2,
    };

    const userRoleLevel = roleHierarchy[userPermissions.role];
    const minimumRoleLevel = roleHierarchy[minimumRole];

    return userRoleLevel >= minimumRoleLevel;
  }

  /**
   * Update user's permission overrides in a workspace
   */
  async updatePermissionOverrides(
    userId: string,
    workspaceId: string,
    overrides: PermissionOverride,
    adminUserId: string,
  ): Promise<void> {
    // Check if admin has permission to update members
    const hasPermission = await this.hasPermission(
      adminUserId,
      workspaceId,
      WorkspacePermission.UPDATE_MEMBERS,
    );

    if (!hasPermission) {
      throw new Error('Insufficient permissions to update member permissions');
    }

    // Don't allow admin to modify their own permissions
    if (userId === adminUserId) {
      throw new Error('Cannot modify your own permissions');
    }

    await this.prisma.membership.update({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      data: {
        permissionsOverride: overrides,
      },
    });
  }

  /**
   * Clear user's permission overrides in a workspace
   */
  async clearPermissionOverrides(
    userId: string,
    workspaceId: string,
    adminUserId: string,
  ): Promise<void> {
    // Check if admin has permission to update members
    const hasPermission = await this.hasPermission(
      adminUserId,
      workspaceId,
      WorkspacePermission.UPDATE_MEMBERS,
    );

    if (!hasPermission) {
      throw new Error('Insufficient permissions to update member permissions');
    }

    // Don't allow admin to modify their own permissions
    if (userId === adminUserId) {
      throw new Error('Cannot modify your own permissions');
    }

    await this.prisma.membership.update({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      data: {
        permissionsOverride: null,
      },
    });
  }

  /**
   * Get all permissions available in the system
   */
  getAllPermissions(): WorkspacePermission[] {
    return Object.values(WorkspacePermission);
  }

  /**
   * Get default permissions for a role
   */
  getRolePermissions(role: MembershipRole): WorkspacePermission[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}
