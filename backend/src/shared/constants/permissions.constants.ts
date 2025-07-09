export enum WorkspacePermission {
  // Workspace management
  VIEW_WORKSPACE = 'workspace:view',
  UPDATE_WORKSPACE = 'workspace:update',
  DELETE_WORKSPACE = 'workspace:delete',

  // Member management
  VIEW_MEMBERS = 'workspace:view_members',
  INVITE_MEMBERS = 'workspace:invite_members',
  UPDATE_MEMBERS = 'workspace:update_members',
  REMOVE_MEMBERS = 'workspace:remove_members',

  // Project management
  VIEW_PROJECTS = 'workspace:view_projects',
  CREATE_PROJECTS = 'workspace:create_projects',
  UPDATE_PROJECTS = 'workspace:update_projects',
  DELETE_PROJECTS = 'workspace:delete_projects',

  // Issue management
  VIEW_ISSUES = 'workspace:view_issues',
  CREATE_ISSUES = 'workspace:create_issues',
  UPDATE_ISSUES = 'workspace:update_issues',
  DELETE_ISSUES = 'workspace:delete_issues',
  ASSIGN_ISSUES = 'workspace:assign_issues',

  // Comment management
  VIEW_COMMENTS = 'workspace:view_comments',
  CREATE_COMMENTS = 'workspace:create_comments',
  UPDATE_COMMENTS = 'workspace:update_comments',
  DELETE_COMMENTS = 'workspace:delete_comments',

  // Label management
  VIEW_LABELS = 'workspace:view_labels',
  CREATE_LABELS = 'workspace:create_labels',
  UPDATE_LABELS = 'workspace:update_labels',
  DELETE_LABELS = 'workspace:delete_labels',

  // Cycle management
  VIEW_CYCLES = 'workspace:view_cycles',
  CREATE_CYCLES = 'workspace:create_cycles',
  UPDATE_CYCLES = 'workspace:update_cycles',
  DELETE_CYCLES = 'workspace:delete_cycles',

  // Integration management
  VIEW_INTEGRATIONS = 'workspace:view_integrations',
  MANAGE_INTEGRATIONS = 'workspace:manage_integrations',

  // Automation management
  VIEW_AUTOMATIONS = 'workspace:view_automations',
  CREATE_AUTOMATIONS = 'workspace:create_automations',
  UPDATE_AUTOMATIONS = 'workspace:update_automations',
  DELETE_AUTOMATIONS = 'workspace:delete_automations',

  // Analytics and reporting
  VIEW_ANALYTICS = 'workspace:view_analytics',
  EXPORT_DATA = 'workspace:export_data',

  // File management
  UPLOAD_FILES = 'workspace:upload_files',
  DELETE_FILES = 'workspace:delete_files',
}

export enum MembershipRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

// Default permissions for each role
export const ROLE_PERMISSIONS: Record<MembershipRole, WorkspacePermission[]> = {
  [MembershipRole.ADMIN]: [
    // Full access to everything
    WorkspacePermission.VIEW_WORKSPACE,
    WorkspacePermission.UPDATE_WORKSPACE,
    WorkspacePermission.DELETE_WORKSPACE,
    WorkspacePermission.VIEW_MEMBERS,
    WorkspacePermission.INVITE_MEMBERS,
    WorkspacePermission.UPDATE_MEMBERS,
    WorkspacePermission.REMOVE_MEMBERS,
    WorkspacePermission.VIEW_PROJECTS,
    WorkspacePermission.CREATE_PROJECTS,
    WorkspacePermission.UPDATE_PROJECTS,
    WorkspacePermission.DELETE_PROJECTS,
    WorkspacePermission.VIEW_ISSUES,
    WorkspacePermission.CREATE_ISSUES,
    WorkspacePermission.UPDATE_ISSUES,
    WorkspacePermission.DELETE_ISSUES,
    WorkspacePermission.ASSIGN_ISSUES,
    WorkspacePermission.VIEW_COMMENTS,
    WorkspacePermission.CREATE_COMMENTS,
    WorkspacePermission.UPDATE_COMMENTS,
    WorkspacePermission.DELETE_COMMENTS,
    WorkspacePermission.VIEW_LABELS,
    WorkspacePermission.CREATE_LABELS,
    WorkspacePermission.UPDATE_LABELS,
    WorkspacePermission.DELETE_LABELS,
    WorkspacePermission.VIEW_CYCLES,
    WorkspacePermission.CREATE_CYCLES,
    WorkspacePermission.UPDATE_CYCLES,
    WorkspacePermission.DELETE_CYCLES,
    WorkspacePermission.VIEW_INTEGRATIONS,
    WorkspacePermission.MANAGE_INTEGRATIONS,
    WorkspacePermission.VIEW_AUTOMATIONS,
    WorkspacePermission.CREATE_AUTOMATIONS,
    WorkspacePermission.UPDATE_AUTOMATIONS,
    WorkspacePermission.DELETE_AUTOMATIONS,
    WorkspacePermission.VIEW_ANALYTICS,
    WorkspacePermission.EXPORT_DATA,
    WorkspacePermission.UPLOAD_FILES,
    WorkspacePermission.DELETE_FILES,
  ],
  [MembershipRole.MEMBER]: [
    // Standard member access
    WorkspacePermission.VIEW_WORKSPACE,
    WorkspacePermission.VIEW_MEMBERS,
    WorkspacePermission.VIEW_PROJECTS,
    WorkspacePermission.CREATE_PROJECTS,
    WorkspacePermission.UPDATE_PROJECTS,
    WorkspacePermission.VIEW_ISSUES,
    WorkspacePermission.CREATE_ISSUES,
    WorkspacePermission.UPDATE_ISSUES,
    WorkspacePermission.ASSIGN_ISSUES,
    WorkspacePermission.VIEW_COMMENTS,
    WorkspacePermission.CREATE_COMMENTS,
    WorkspacePermission.UPDATE_COMMENTS,
    WorkspacePermission.VIEW_LABELS,
    WorkspacePermission.CREATE_LABELS,
    WorkspacePermission.UPDATE_LABELS,
    WorkspacePermission.VIEW_CYCLES,
    WorkspacePermission.CREATE_CYCLES,
    WorkspacePermission.UPDATE_CYCLES,
    WorkspacePermission.VIEW_INTEGRATIONS,
    WorkspacePermission.VIEW_AUTOMATIONS,
    WorkspacePermission.CREATE_AUTOMATIONS,
    WorkspacePermission.UPDATE_AUTOMATIONS,
    WorkspacePermission.VIEW_ANALYTICS,
    WorkspacePermission.UPLOAD_FILES,
  ],
  [MembershipRole.GUEST]: [
    // Limited read-only access
    WorkspacePermission.VIEW_WORKSPACE,
    WorkspacePermission.VIEW_MEMBERS,
    WorkspacePermission.VIEW_PROJECTS,
    WorkspacePermission.VIEW_ISSUES,
    WorkspacePermission.VIEW_COMMENTS,
    WorkspacePermission.CREATE_COMMENTS,
    WorkspacePermission.VIEW_LABELS,
    WorkspacePermission.VIEW_CYCLES,
    WorkspacePermission.VIEW_INTEGRATIONS,
    WorkspacePermission.VIEW_AUTOMATIONS,
  ],
};

export type PermissionOverride = {
  granted?: WorkspacePermission[];
  revoked?: WorkspacePermission[];
};
