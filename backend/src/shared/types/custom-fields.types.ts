export enum CustomFieldType {
  // Core Data Types
  TEXT_SHORT = 'text_short',
  TEXT_LONG = 'text_long',
  NUMBER = 'number',
  DATE = 'date',
  DATETIME = 'datetime',
  URL = 'url',
  EMAIL = 'email',

  // Selection Types
  SINGLE_SELECT = 'single_select',
  MULTI_SELECT = 'multi_select',
  RADIO_BUTTONS = 'radio_buttons',
  CHECKBOXES = 'checkboxes',
  BOOLEAN = 'boolean',

  // User & Organization
  USER_SINGLE = 'user_single',
  USER_MULTI = 'user_multi',
  TEAM = 'team',

  // Specialized Types
  LABELS = 'labels',
  PROGRESS = 'progress',
  CURRENCY = 'currency',
  FILE_ATTACHMENT = 'file_attachment',
  RATING = 'rating',
}

export interface CustomFieldOption {
  id: string;
  label: string;
  value: string;
  color?: string;
  description?: string;
}

export interface CustomFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowedFileTypes?: string[];
  maxFileSize?: number;
}

export interface CustomFieldConfig {
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: CustomFieldOption[];
  validation?: CustomFieldValidation;
  // For number fields
  decimalPlaces?: number;
  // For currency fields
  currency?: string;
  // For rating fields
  maxRating?: number;
  ratingStyle?: 'stars' | 'numbers';
  // For date fields
  includeTime?: boolean;
  // For file fields
  allowMultiple?: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: CustomFieldType;
  required?: boolean;
  order?: number;
  options?: CustomFieldOption[];
  validation?: CustomFieldValidation;
  config?: Record<string, any>;
  defaultValue?: any;

  // Field-level security
  security?: {
    sensitive?: boolean; // Requires VIEW_SENSITIVE_FIELDS permission to view
    adminOnly?: boolean; // Requires MANAGE_CUSTOM_FIELDS permission to edit
    readOnly?: boolean; // Cannot be edited by users (only via API/admin)
    visibleToRoles?: string[]; // Only visible to specific roles
    editableByRoles?: string[]; // Only editable by specific roles
  };

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CustomFieldValue {
  fieldId: string;
  value: any;
  updatedAt: Date;
  updatedBy: string;
}

export interface ProjectCustomFields {
  definitions: CustomFieldDefinition[];
  values: Record<string, CustomFieldValue>;
}

// Common validation errors
export class CustomFieldValidationError extends Error {
  constructor(
    public fieldId: string,
    public fieldName: string,
    message: string,
  ) {
    super(`Custom field '${fieldName}': ${message}`);
    this.name = 'CustomFieldValidationError';
  }
}

// Type guards for runtime validation
export function isValidCustomFieldType(type: string): type is CustomFieldType {
  return Object.values(CustomFieldType).includes(type as CustomFieldType);
}

export function isSelectFieldType(type: CustomFieldType): boolean {
  return [
    CustomFieldType.SINGLE_SELECT,
    CustomFieldType.MULTI_SELECT,
    CustomFieldType.RADIO_BUTTONS,
    CustomFieldType.CHECKBOXES,
  ].includes(type);
}

export function isUserFieldType(type: CustomFieldType): boolean {
  return [CustomFieldType.USER_SINGLE, CustomFieldType.USER_MULTI].includes(
    type,
  );
}

export function requiresOptions(type: CustomFieldType): boolean {
  return isSelectFieldType(type) || type === CustomFieldType.TEAM;
}

export function supportsMultipleValues(type: CustomFieldType): boolean {
  return [
    CustomFieldType.MULTI_SELECT,
    CustomFieldType.CHECKBOXES,
    CustomFieldType.USER_MULTI,
    CustomFieldType.LABELS,
  ].includes(type);
}

// Default configurations for each field type
export const DEFAULT_FIELD_CONFIGS: Record<
  CustomFieldType,
  Partial<CustomFieldConfig>
> = {
  [CustomFieldType.TEXT_SHORT]: {
    validation: { maxLength: 255 },
  },
  [CustomFieldType.TEXT_LONG]: {
    validation: { maxLength: 5000 },
  },
  [CustomFieldType.NUMBER]: {
    decimalPlaces: 0,
  },
  [CustomFieldType.DATE]: {
    includeTime: false,
  },
  [CustomFieldType.DATETIME]: {
    includeTime: true,
  },
  [CustomFieldType.URL]: {
    validation: { pattern: '^https?://.+' },
  },
  [CustomFieldType.EMAIL]: {
    validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' },
  },
  [CustomFieldType.SINGLE_SELECT]: {
    options: [],
  },
  [CustomFieldType.MULTI_SELECT]: {
    options: [],
  },
  [CustomFieldType.RADIO_BUTTONS]: {
    options: [],
  },
  [CustomFieldType.CHECKBOXES]: {
    options: [],
  },
  [CustomFieldType.BOOLEAN]: {
    defaultValue: false,
  },
  [CustomFieldType.USER_SINGLE]: {},
  [CustomFieldType.USER_MULTI]: {},
  [CustomFieldType.TEAM]: {
    options: [],
  },
  [CustomFieldType.LABELS]: {},
  [CustomFieldType.PROGRESS]: {
    validation: { min: 0, max: 100 },
  },
  [CustomFieldType.CURRENCY]: {
    currency: 'USD',
    decimalPlaces: 2,
  },
  [CustomFieldType.FILE_ATTACHMENT]: {
    allowMultiple: false,
    validation: {
      allowedFileTypes: ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'],
      maxFileSize: 10485760, // 10MB
    },
  },
  [CustomFieldType.RATING]: {
    maxRating: 5,
    ratingStyle: 'stars',
  },
};
