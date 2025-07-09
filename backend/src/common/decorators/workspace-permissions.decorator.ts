import { SetMetadata } from '@nestjs/common';
import {
  WorkspacePermission,
  MembershipRole,
} from '../../shared/constants/permissions.constants';

export const WORKSPACE_PERMISSIONS_KEY = 'workspace-permissions';
export const WORKSPACE_ROLES_KEY = 'workspace-roles';
export const MINIMUM_ROLE_KEY = 'minimum-role';

/**
 * Decorator to require specific workspace permissions
 */
export const RequireWorkspacePermissions = (
  ...permissions: WorkspacePermission[]
) => SetMetadata(WORKSPACE_PERMISSIONS_KEY, permissions);

/**
 * Decorator to require specific workspace roles
 */
export const RequireWorkspaceRoles = (...roles: MembershipRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);

/**
 * Decorator to require minimum role level (role hierarchy)
 */
export const RequireMinimumRole = (role: MembershipRole) =>
  SetMetadata(MINIMUM_ROLE_KEY, role);

/**
 * Decorator to require admin role
 */
export const RequireAdmin = () => RequireWorkspaceRoles(MembershipRole.ADMIN);

/**
 * Decorator to require member role or higher
 */
export const RequireMember = () => RequireMinimumRole(MembershipRole.MEMBER);

/**
 * Common permission decorators for convenience
 */

export const CanViewWorkspace = () =>
  RequireWorkspacePermissions(WorkspacePermission.VIEW_WORKSPACE);

export const CanUpdateWorkspace = () =>
  RequireWorkspacePermissions(WorkspacePermission.UPDATE_WORKSPACE);

export const CanDeleteWorkspace = () =>
  RequireWorkspacePermissions(WorkspacePermission.DELETE_WORKSPACE);

export const CanViewMembers = () =>
  RequireWorkspacePermissions(WorkspacePermission.VIEW_MEMBERS);

export const CanInviteMembers = () =>
  RequireWorkspacePermissions(WorkspacePermission.INVITE_MEMBERS);

export const CanUpdateMembers = () =>
  RequireWorkspacePermissions(WorkspacePermission.UPDATE_MEMBERS);

export const CanRemoveMembers = () =>
  RequireWorkspacePermissions(WorkspacePermission.REMOVE_MEMBERS);

export const CanViewProjects = () =>
  RequireWorkspacePermissions(WorkspacePermission.VIEW_PROJECTS);

export const CanCreateProjects = () =>
  RequireWorkspacePermissions(WorkspacePermission.CREATE_PROJECTS);

export const CanUpdateProjects = () =>
  RequireWorkspacePermissions(WorkspacePermission.UPDATE_PROJECTS);

export const CanDeleteProjects = () =>
  RequireWorkspacePermissions(WorkspacePermission.DELETE_PROJECTS);

export const CanViewIssues = () =>
  RequireWorkspacePermissions(WorkspacePermission.VIEW_ISSUES);

export const CanCreateIssues = () =>
  RequireWorkspacePermissions(WorkspacePermission.CREATE_ISSUES);

export const CanUpdateIssues = () =>
  RequireWorkspacePermissions(WorkspacePermission.UPDATE_ISSUES);

export const CanDeleteIssues = () =>
  RequireWorkspacePermissions(WorkspacePermission.DELETE_ISSUES);

export const CanAssignIssues = () =>
  RequireWorkspacePermissions(WorkspacePermission.ASSIGN_ISSUES);

export const CanManageIntegrations = () =>
  RequireWorkspacePermissions(WorkspacePermission.MANAGE_INTEGRATIONS);

export const CanViewAnalytics = () =>
  RequireWorkspacePermissions(WorkspacePermission.VIEW_ANALYTICS);

export const CanExportData = () =>
  RequireWorkspacePermissions(WorkspacePermission.EXPORT_DATA);

// Custom Field Permission Decorators
export const CanViewCustomFields = () =>
  SetMetadata('requiredPermissions', [WorkspacePermission.VIEW_CUSTOM_FIELDS]);

export const CanManageCustomFields = () =>
  SetMetadata('requiredPermissions', [
    WorkspacePermission.MANAGE_CUSTOM_FIELDS,
  ]);

export const CanCreateCustomFields = () =>
  SetMetadata('requiredPermissions', [
    WorkspacePermission.CREATE_CUSTOM_FIELDS,
  ]);

export const CanUpdateCustomFields = () =>
  SetMetadata('requiredPermissions', [
    WorkspacePermission.UPDATE_CUSTOM_FIELDS,
  ]);

export const CanDeleteCustomFields = () =>
  SetMetadata('requiredPermissions', [
    WorkspacePermission.DELETE_CUSTOM_FIELDS,
  ]);

export const CanViewSensitiveFields = () =>
  SetMetadata('requiredPermissions', [
    WorkspacePermission.VIEW_SENSITIVE_FIELDS,
  ]);

export const CanUpdateSensitiveFields = () =>
  SetMetadata('requiredPermissions', [
    WorkspacePermission.UPDATE_SENSITIVE_FIELDS,
  ]);
