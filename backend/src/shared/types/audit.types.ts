export enum AuditAction {
  // User actions
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_SIGNUP = 'user.signup',
  USER_PROFILE_UPDATE = 'user.profile.update',
  USER_PASSWORD_CHANGE = 'user.password.change',
  USER_EMAIL_VERIFY = 'user.email.verify',

  // Workspace actions
  WORKSPACE_CREATE = 'workspace.create',
  WORKSPACE_UPDATE = 'workspace.update',
  WORKSPACE_DELETE = 'workspace.delete',
  WORKSPACE_MEMBER_INVITE = 'workspace.member.invite',
  WORKSPACE_MEMBER_REMOVE = 'workspace.member.remove',
  WORKSPACE_MEMBER_ROLE_UPDATE = 'workspace.member.role.update',

  // Project actions
  PROJECT_CREATE = 'project.create',
  PROJECT_UPDATE = 'project.update',
  PROJECT_DELETE = 'project.delete',

  // Issue actions
  ISSUE_CREATE = 'issue.create',
  ISSUE_UPDATE = 'issue.update',
  ISSUE_DELETE = 'issue.delete',
  ISSUE_ASSIGN = 'issue.assign',
  ISSUE_STATUS_CHANGE = 'issue.status.change',

  // Permission actions
  PERMISSION_GRANT = 'permission.grant',
  PERMISSION_REVOKE = 'permission.revoke',
  PERMISSION_OVERRIDE_UPDATE = 'permission.override.update',
  PERMISSION_OVERRIDE_CLEAR = 'permission.override.clear',

  // Security actions
  SECURITY_LOGIN_FAILED = 'security.login.failed',
  SECURITY_TOKEN_REFRESH = 'security.token.refresh',
  SECURITY_SESSION_TERMINATE = 'security.session.terminate',
}

export enum AuditTargetType {
  USER = 'user',
  WORKSPACE = 'workspace',
  PROJECT = 'project',
  ISSUE = 'issue',
  COMMENT = 'comment',
  MEMBERSHIP = 'membership',
  PERMISSION = 'permission',
  SESSION = 'session',
}

export interface AuditLogEntry {
  id: string;
  workspaceId?: string; // Optional for user-level actions
  userId?: string; // Optional for system actions
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  changes?: Record<string, { before?: any; after?: any }>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreateAuditLogDto {
  workspaceId?: string;
  userId?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  changes?: Record<string, { before?: any; after?: any }>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  workspaceId?: string;
  userId?: string;
  action?: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
