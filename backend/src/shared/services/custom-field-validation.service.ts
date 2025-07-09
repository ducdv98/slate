import { Injectable } from '@nestjs/common';
import {
  CustomFieldType,
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldValidation,
  CustomFieldValidationError,
  isValidCustomFieldType,
  requiresOptions,
  supportsMultipleValues,
  DEFAULT_FIELD_CONFIGS,
} from '../types/custom-fields.types';

@Injectable()
export class CustomFieldValidationService {
  /**
   * Validates a custom field definition
   */
  validateFieldDefinition(definition: Partial<CustomFieldDefinition>): void {
    if (!definition.name?.trim()) {
      throw new CustomFieldValidationError(
        definition.id || 'unknown',
        'Unknown Field',
        'Field name is required',
      );
    }

    if (!definition.type || !isValidCustomFieldType(definition.type)) {
      throw new CustomFieldValidationError(
        definition.id || 'unknown',
        definition.name || 'Unknown Field',
        `Invalid field type: ${definition.type}`,
      );
    }

    // Validate field name length
    if (definition.name.length > 100) {
      throw new CustomFieldValidationError(
        definition.id || 'unknown',
        definition.name,
        'Field name cannot exceed 100 characters',
      );
    }

    // Validate description length
    if (definition.description && definition.description.length > 500) {
      throw new CustomFieldValidationError(
        definition.id || 'unknown',
        definition.name,
        'Field description cannot exceed 500 characters',
      );
    }

    // Validate field configuration
    this.validateFieldConfig(
      definition.type,
      definition.config || {},
      definition.name,
    );
  }

  /**
   * Validates field configuration based on field type
   */
  private validateFieldConfig(
    type: CustomFieldType,
    config: any,
    fieldName: string,
  ): void {
    const defaultConfig = DEFAULT_FIELD_CONFIGS[type];

    // Check if options are required but missing
    if (
      requiresOptions(type) &&
      (!config.options || config.options.length === 0)
    ) {
      throw new CustomFieldValidationError(
        'unknown',
        fieldName,
        `Field type '${type}' requires at least one option`,
      );
    }

    // Validate options if present
    if (config.options) {
      this.validateOptions(config.options, fieldName);
    }

    // Type-specific validations
    switch (type) {
      case CustomFieldType.NUMBER:
      case CustomFieldType.CURRENCY:
        this.validateNumberConfig(config, fieldName);
        break;
      case CustomFieldType.RATING:
        this.validateRatingConfig(config, fieldName);
        break;
      case CustomFieldType.PROGRESS:
        this.validateProgressConfig(config, fieldName);
        break;
      case CustomFieldType.FILE_ATTACHMENT:
        this.validateFileConfig(config, fieldName);
        break;
      case CustomFieldType.TEXT_SHORT:
      case CustomFieldType.TEXT_LONG:
        this.validateTextConfig(config, fieldName);
        break;
    }

    // Validate validation rules
    if (config.validation) {
      this.validateValidationRules(config.validation, type, fieldName);
    }
  }

  /**
   * Validates field options
   */
  private validateOptions(options: any[], fieldName: string): void {
    if (!Array.isArray(options)) {
      throw new CustomFieldValidationError(
        'unknown',
        fieldName,
        'Options must be an array',
      );
    }

    if (options.length > 50) {
      throw new CustomFieldValidationError(
        'unknown',
        fieldName,
        'Cannot exceed 50 options',
      );
    }

    const values = new Set();
    const labels = new Set();

    options.forEach((option, index) => {
      if (!option.id || !option.label || !option.value) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          `Option ${index + 1} must have id, label, and value`,
        );
      }

      if (values.has(option.value)) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          `Duplicate option value: ${option.value}`,
        );
      }

      if (labels.has(option.label)) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          `Duplicate option label: ${option.label}`,
        );
      }

      if (option.label.length > 100) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          `Option label '${option.label}' cannot exceed 100 characters`,
        );
      }

      values.add(option.value);
      labels.add(option.label);
    });
  }

  /**
   * Validates number field configuration
   */
  private validateNumberConfig(config: any, fieldName: string): void {
    if (config.decimalPlaces !== undefined) {
      if (
        !Number.isInteger(config.decimalPlaces) ||
        config.decimalPlaces < 0 ||
        config.decimalPlaces > 10
      ) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Decimal places must be an integer between 0 and 10',
        );
      }
    }

    if (config.currency && typeof config.currency !== 'string') {
      throw new CustomFieldValidationError(
        'unknown',
        fieldName,
        'Currency must be a valid currency code',
      );
    }
  }

  /**
   * Validates rating field configuration
   */
  private validateRatingConfig(config: any, fieldName: string): void {
    if (config.maxRating !== undefined) {
      if (
        !Number.isInteger(config.maxRating) ||
        config.maxRating < 1 ||
        config.maxRating > 10
      ) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Max rating must be an integer between 1 and 10',
        );
      }
    }

    if (
      config.ratingStyle &&
      !['stars', 'numbers'].includes(config.ratingStyle)
    ) {
      throw new CustomFieldValidationError(
        'unknown',
        fieldName,
        'Rating style must be "stars" or "numbers"',
      );
    }
  }

  /**
   * Validates progress field configuration
   */
  private validateProgressConfig(config: any, fieldName: string): void {
    if (config.validation) {
      const { min, max } = config.validation;
      if (min !== undefined && (min < 0 || min > 100)) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Progress minimum must be between 0 and 100',
        );
      }
      if (max !== undefined && (max < 0 || max > 100)) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Progress maximum must be between 0 and 100',
        );
      }
      if (min !== undefined && max !== undefined && min >= max) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Progress minimum must be less than maximum',
        );
      }
    }
  }

  /**
   * Validates file field configuration
   */
  private validateFileConfig(config: any, fieldName: string): void {
    if (config.validation) {
      const { allowedFileTypes, maxFileSize } = config.validation;

      if (allowedFileTypes && !Array.isArray(allowedFileTypes)) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Allowed file types must be an array',
        );
      }

      if (
        maxFileSize !== undefined &&
        (!Number.isInteger(maxFileSize) || maxFileSize <= 0)
      ) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Max file size must be a positive integer (bytes)',
        );
      }
    }
  }

  /**
   * Validates text field configuration
   */
  private validateTextConfig(config: any, fieldName: string): void {
    if (config.validation) {
      const { minLength, maxLength } = config.validation;

      if (
        minLength !== undefined &&
        (!Number.isInteger(minLength) || minLength < 0)
      ) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Minimum length must be a non-negative integer',
        );
      }

      if (
        maxLength !== undefined &&
        (!Number.isInteger(maxLength) || maxLength <= 0)
      ) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Maximum length must be a positive integer',
        );
      }

      if (
        minLength !== undefined &&
        maxLength !== undefined &&
        minLength >= maxLength
      ) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Minimum length must be less than maximum length',
        );
      }
    }
  }

  /**
   * Validates validation rules
   */
  private validateValidationRules(
    validation: CustomFieldValidation,
    type: CustomFieldType,
    fieldName: string,
  ): void {
    if (validation.pattern) {
      try {
        new RegExp(validation.pattern);
      } catch (error) {
        throw new CustomFieldValidationError(
          'unknown',
          fieldName,
          'Invalid regular expression pattern',
        );
      }
    }

    // Type-specific validation rule checks
    if (
      type === CustomFieldType.TEXT_SHORT &&
      validation.maxLength &&
      validation.maxLength > 255
    ) {
      throw new CustomFieldValidationError(
        'unknown',
        fieldName,
        'Short text fields cannot exceed 255 characters',
      );
    }

    if (
      type === CustomFieldType.TEXT_LONG &&
      validation.maxLength &&
      validation.maxLength > 5000
    ) {
      throw new CustomFieldValidationError(
        'unknown',
        fieldName,
        'Long text fields cannot exceed 5000 characters',
      );
    }
  }

  /**
   * Validates a custom field value against its definition
   */
  validateFieldValue(definition: CustomFieldDefinition, value: any): void {
    const { type, config, name } = definition;

    // Check if field is required
    if (
      config.validation?.required &&
      (value === null || value === undefined || value === '')
    ) {
      throw new CustomFieldValidationError(
        definition.id,
        name,
        'This field is required',
      );
    }

    // Skip validation if value is empty and field is not required
    if (value === null || value === undefined || value === '') {
      return;
    }

    // Type-specific value validation
    switch (type) {
      case CustomFieldType.TEXT_SHORT:
      case CustomFieldType.TEXT_LONG:
        this.validateTextValue(definition, value);
        break;
      case CustomFieldType.NUMBER:
      case CustomFieldType.CURRENCY:
        this.validateNumberValue(definition, value);
        break;
      case CustomFieldType.DATE:
      case CustomFieldType.DATETIME:
        this.validateDateValue(definition, value);
        break;
      case CustomFieldType.URL:
        this.validateUrlValue(definition, value);
        break;
      case CustomFieldType.EMAIL:
        this.validateEmailValue(definition, value);
        break;
      case CustomFieldType.BOOLEAN:
        this.validateBooleanValue(definition, value);
        break;
      case CustomFieldType.SINGLE_SELECT:
      case CustomFieldType.RADIO_BUTTONS:
        this.validateSingleSelectValue(definition, value);
        break;
      case CustomFieldType.MULTI_SELECT:
      case CustomFieldType.CHECKBOXES:
        this.validateMultiSelectValue(definition, value);
        break;
      case CustomFieldType.PROGRESS:
        this.validateProgressValue(definition, value);
        break;
      case CustomFieldType.RATING:
        this.validateRatingValue(definition, value);
        break;
      case CustomFieldType.LABELS:
        this.validateLabelsValue(definition, value);
        break;
      case CustomFieldType.USER_SINGLE:
        this.validateUserValue(definition, value, false);
        break;
      case CustomFieldType.USER_MULTI:
        this.validateUserValue(definition, value, true);
        break;
    }
  }

  /**
   * Validates text field values
   */
  private validateTextValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    if (typeof value !== 'string') {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a string',
      );
    }

    const { validation } = definition.config;
    if (validation) {
      if (validation.minLength && value.length < validation.minLength) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          `Value must be at least ${validation.minLength} characters`,
        );
      }

      if (validation.maxLength && value.length > validation.maxLength) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          `Value cannot exceed ${validation.maxLength} characters`,
        );
      }

      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          'Value does not match required pattern',
        );
      }
    }
  }

  /**
   * Validates number field values
   */
  private validateNumberValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a valid number',
      );
    }

    const { validation } = definition.config;
    if (validation) {
      if (validation.min !== undefined && numValue < validation.min) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          `Value must be at least ${validation.min}`,
        );
      }

      if (validation.max !== undefined && numValue > validation.max) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          `Value cannot exceed ${validation.max}`,
        );
      }
    }
  }

  /**
   * Validates date field values
   */
  private validateDateValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    if (typeof value !== 'string' || isNaN(Date.parse(value))) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a valid date',
      );
    }
  }

  /**
   * Validates URL field values
   */
  private validateUrlValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    if (typeof value !== 'string') {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a string',
      );
    }

    try {
      new URL(value);
    } catch (error) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a valid URL',
      );
    }
  }

  /**
   * Validates email field values
   */
  private validateEmailValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    if (typeof value !== 'string') {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a string',
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a valid email address',
      );
    }
  }

  /**
   * Validates boolean field values
   */
  private validateBooleanValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    if (typeof value !== 'boolean') {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a boolean',
      );
    }
  }

  /**
   * Validates single select field values
   */
  private validateSingleSelectValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    if (typeof value !== 'string') {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be a string',
      );
    }

    const validValues =
      definition.config.options?.map((option) => option.value) || [];
    if (!validValues.includes(value)) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be one of the configured options',
      );
    }
  }

  /**
   * Validates multi select field values
   */
  private validateMultiSelectValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    if (!Array.isArray(value)) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Value must be an array',
      );
    }

    const validValues =
      definition.config.options?.map((option) => option.value) || [];
    for (const item of value) {
      if (typeof item !== 'string' || !validValues.includes(item)) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          'All values must be from the configured options',
        );
      }
    }
  }

  /**
   * Validates progress field values
   */
  private validateProgressValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Progress value must be a number',
      );
    }

    if (numValue < 0 || numValue > 100) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Progress value must be between 0 and 100',
      );
    }
  }

  /**
   * Validates rating field values
   */
  private validateRatingValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    const numValue = Number(value);
    if (isNaN(numValue) || !Number.isInteger(numValue)) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Rating value must be an integer',
      );
    }

    const maxRating = definition.config.maxRating || 5;
    if (numValue < 1 || numValue > maxRating) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        `Rating value must be between 1 and ${maxRating}`,
      );
    }
  }

  /**
   * Validates labels field values
   */
  private validateLabelsValue(
    definition: CustomFieldDefinition,
    value: any,
  ): void {
    if (!Array.isArray(value)) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Labels value must be an array',
      );
    }

    for (const label of value) {
      if (typeof label !== 'string' || label.trim().length === 0) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          'All labels must be non-empty strings',
        );
      }

      if (label.length > 50) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          'Labels cannot exceed 50 characters',
        );
      }
    }

    if (value.length > 20) {
      throw new CustomFieldValidationError(
        definition.id,
        definition.name,
        'Cannot have more than 20 labels',
      );
    }
  }

  /**
   * Validates user field values
   */
  private validateUserValue(
    definition: CustomFieldDefinition,
    value: any,
    multiple: boolean,
  ): void {
    if (multiple) {
      if (!Array.isArray(value)) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          'Value must be an array of user IDs',
        );
      }

      for (const userId of value) {
        if (typeof userId !== 'string' || userId.trim().length === 0) {
          throw new CustomFieldValidationError(
            definition.id,
            definition.name,
            'All user IDs must be non-empty strings',
          );
        }
      }
    } else {
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new CustomFieldValidationError(
          definition.id,
          definition.name,
          'Value must be a valid user ID',
        );
      }
    }
  }
}
