import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomFieldValueDto } from './custom-field.dto';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Mobile App Development',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Development of the company mobile application with core features',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Project start date',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Project target completion date',
    example: '2024-06-15',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({
    description: 'Custom field values for this project',
    type: [CustomFieldValueDto],
    example: [
      {
        fieldId: 'priority-field-uuid',
        value: 'high',
      },
      {
        fieldId: 'budget-field-uuid',
        value: 50000,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldValueDto)
  customFields?: CustomFieldValueDto[];
}
