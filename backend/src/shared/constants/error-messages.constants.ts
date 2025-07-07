export const ERROR_MESSAGES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token provided',
  INVALID_CREDENTIALS: 'Invalid email or password',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided',
  REQUIRED_FIELD: 'This field is required',

  // Database
  RESOURCE_NOT_FOUND: 'Resource not found',
  DUPLICATE_ENTRY: 'Resource already exists',
  FOREIGN_KEY_CONSTRAINT:
    'Cannot delete resource: it is referenced by other records',
  DATABASE_CONNECTION_ERROR: 'Database connection error',

  // Business Logic
  WORKSPACE_LIMIT_EXCEEDED: 'Workspace limit exceeded',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation',
  INVALID_OPERATION: 'Invalid operation',
  USER_NOT_MEMBER: 'User is not a member of this workspace',
  PROJECT_NOT_FOUND: 'Project not found',
  ISSUE_NOT_FOUND: 'Issue not found',

  // System
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  REQUEST_TIMEOUT: 'Request timeout',

  // File Operations
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  UNSUPPORTED_FILE_TYPE: 'Unsupported file type',
  FILE_UPLOAD_FAILED: 'File upload failed',
} as const;
