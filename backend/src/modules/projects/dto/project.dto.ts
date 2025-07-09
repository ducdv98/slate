import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldValueDto } from './custom-field.dto';

export class ProjectDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'Workspace ID',
    example: 'uuid-v4-string',
  })
  workspaceId: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Mobile App Development',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Development of the company mobile application with core features',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Project start date',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Project target completion date',
    example: '2024-06-15',
    type: String,
    format: 'date',
  })
  targetDate?: string;

  @ApiPropertyOptional({
    description: 'Project completion progress (0-100)',
    example: 65.5,
    minimum: 0,
    maximum: 100,
  })
  progress?: number;

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
  customFields?: CustomFieldValueDto[];

  @ApiProperty({
    description: 'Project creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Total number of issues in project',
    example: 25,
  })
  issueCount?: number;

  @ApiPropertyOptional({
    description: 'Number of completed issues in project',
    example: 15,
  })
  completedIssueCount?: number;

  @ApiPropertyOptional({
    description: 'Number of milestones in project',
    example: 4,
  })
  milestoneCount?: number;
}
