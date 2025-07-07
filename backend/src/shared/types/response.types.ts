export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
  performance?: PerformanceMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PerformanceMeta {
  executionTime?: number; // in milliseconds
  cacheHit?: boolean;
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  meta: ResponseMeta & {
    pagination: PaginationMeta;
  };
}

export interface ListResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Success response messages
export const SUCCESS_MESSAGES = {
  // General
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',

  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  TOKEN_REFRESHED: 'Token refreshed successfully',
  EMAIL_VERIFIED: 'Email verified successfully',

  // User operations
  USER_CREATED: 'User account created successfully',
  USER_UPDATED: 'User profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',

  // Workspace operations
  WORKSPACE_CREATED: 'Workspace created successfully',
  WORKSPACE_UPDATED: 'Workspace updated successfully',
  MEMBER_INVITED: 'Member invited successfully',
  MEMBER_REMOVED: 'Member removed successfully',

  // Project operations
  PROJECT_CREATED: 'Project created successfully',
  PROJECT_UPDATED: 'Project updated successfully',
  PROJECT_DELETED: 'Project deleted successfully',

  // Issue operations
  ISSUE_CREATED: 'Issue created successfully',
  ISSUE_UPDATED: 'Issue updated successfully',
  ISSUE_DELETED: 'Issue deleted successfully',
  ISSUE_ASSIGNED: 'Issue assigned successfully',

  // File operations
  FILE_UPLOADED: 'File uploaded successfully',
  FILE_DELETED: 'File deleted successfully',
} as const;
