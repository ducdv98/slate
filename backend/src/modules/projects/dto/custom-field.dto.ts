import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsObject,
  ValidateNested,
  Length,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CustomFieldType,
  CustomFieldOption,
  CustomFieldValidation,
} from '../../../shared/types/custom-fields.types';

export class CustomFieldOptionDto implements CustomFieldOption {
  @ApiProperty({
    description: 'Option ID',
    example: 'high-priority',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Option label',
    example: 'High Priority',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  label: string;

  @ApiProperty({
    description: 'Option value',
    example: 'high',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({
    description: 'Option color (hex code)',
    example: '#ff0000',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Option description',
    example: 'Items that need immediate attention',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;
}

export class CustomFieldValidationDto implements CustomFieldValidation {
  @ApiPropertyOptional({
    description: 'Whether field is required',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum value (for numbers)',
    example: 0,
  })
  @IsOptional()
  min?: number;

  @ApiPropertyOptional({
    description: 'Maximum value (for numbers)',
    example: 100,
  })
  @IsOptional()
  max?: number;

  @ApiPropertyOptional({
    description: 'Minimum length (for text)',
    example: 1,
  })
  @IsOptional()
  minLength?: number;

  @ApiPropertyOptional({
    description: 'Maximum length (for text)',
    example: 500,
  })
  @IsOptional()
  maxLength?: number;

  @ApiPropertyOptional({
    description: 'Regular expression pattern (for text)',
    example: '^[A-Z]+$',
  })
  @IsOptional()
  @IsString()
  pattern?: string;
}

export class CustomFieldDefinitionDto {
  @ApiProperty({
    description: 'Custom field ID',
    example: 'priority-field',
  })
  @IsUUID(4)
  id: string;

  @ApiProperty({
    description: 'Field name',
    example: 'Priority',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Field description',
    example: 'Priority level for this project',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    description: 'Field type',
    enum: CustomFieldType,
    example: CustomFieldType.SINGLE_SELECT,
  })
  @IsEnum(CustomFieldType)
  type: CustomFieldType;

  @ApiPropertyOptional({
    description: 'Whether field is required',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: 'Display order',
    example: 1,
  })
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'Field options (for select fields)',
    type: [CustomFieldOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldOptionDto)
  options?: CustomFieldOptionDto[];

  @ApiPropertyOptional({
    description: 'Field validation rules',
    type: CustomFieldValidationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomFieldValidationDto)
  validation?: CustomFieldValidationDto;

  @ApiPropertyOptional({
    description: 'Field configuration (type-specific settings)',
    example: {
      decimalPlaces: 2,
      currency: 'USD',
    },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Default value for the field',
    example: 'medium',
  })
  @IsOptional()
  defaultValue?: any;
}

export class CustomFieldValueDto {
  @ApiProperty({
    description: 'Custom field ID',
    example: 'priority-field',
  })
  @IsUUID(4)
  fieldId: string;

  @ApiProperty({
    description: 'Field value (type depends on field type)',
    example: 'high',
  })
  value: any;
}

export class ProjectCustomFieldsDto {
  @ApiPropertyOptional({
    description: 'Custom field definitions for the workspace',
    type: [CustomFieldDefinitionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDefinitionDto)
  definitions?: CustomFieldDefinitionDto[];

  @ApiPropertyOptional({
    description: 'Custom field values for this project',
    type: [CustomFieldValueDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldValueDto)
  values?: CustomFieldValueDto[];
}
