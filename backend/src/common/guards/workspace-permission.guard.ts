import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../../modules/workspace/services/permission.service';
import {
  WorkspacePermission,
  MembershipRole,
} from '../../shared/constants/permissions.constants';
import {
  WORKSPACE_PERMISSIONS_KEY,
  WORKSPACE_ROLES_KEY,
  MINIMUM_ROLE_KEY,
} from '../decorators/workspace-permissions.decorator';

export interface WorkspacePermissionOptions {
  permissions?: WorkspacePermission[];
  roles?: MembershipRole[];
  minimumRole?: MembershipRole;
  requireAll?: boolean; // If true, user must have ALL permissions; if false, ANY permission
}

interface AuthenticatedRequest {
  user: { id: string; email: string };
  params: { id?: string; workspaceId?: string };
}

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract workspace ID from route parameters
    const workspaceId = request.params.id || request.params.workspaceId;
    if (!workspaceId) {
      throw new BadRequestException('Workspace ID not found in request');
    }

    // Get permission requirements from decorators
    const permissionOptions = this.getPermissionOptions(context);

    if (!permissionOptions) {
      // No permission requirements specified, allow access
      return true;
    }

    // Check role requirements
    if (permissionOptions.roles && permissionOptions.roles.length > 0) {
      const hasRole = await this.permissionService.hasAnyRole(
        user.id,
        workspaceId,
        permissionOptions.roles,
      );

      if (!hasRole) {
        throw new ForbiddenException('Insufficient role permissions');
      }
    }

    // Check minimum role requirement
    if (permissionOptions.minimumRole) {
      const hasMinimumRole = await this.permissionService.hasMinimumRole(
        user.id,
        workspaceId,
        permissionOptions.minimumRole,
      );

      if (!hasMinimumRole) {
        throw new ForbiddenException('Insufficient role level');
      }
    }

    // Check permission requirements
    if (
      permissionOptions.permissions &&
      permissionOptions.permissions.length > 0
    ) {
      const hasPermissions = permissionOptions.requireAll
        ? await this.permissionService.hasAllPermissions(
            user.id,
            workspaceId,
            permissionOptions.permissions,
          )
        : await this.permissionService.hasAnyPermission(
            user.id,
            workspaceId,
            permissionOptions.permissions,
          );

      if (!hasPermissions) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }

  private getPermissionOptions(
    context: ExecutionContext,
  ): WorkspacePermissionOptions | null {
    const permissions = this.reflector.getAllAndOverride<WorkspacePermission[]>(
      WORKSPACE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const roles = this.reflector.getAllAndOverride<MembershipRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const minimumRole = this.reflector.getAllAndOverride<MembershipRole>(
      MINIMUM_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissions && !roles && !minimumRole) {
      return null;
    }

    return {
      permissions,
      roles,
      minimumRole,
      requireAll: false, // Default to requiring ANY permission
    };
  }
}
