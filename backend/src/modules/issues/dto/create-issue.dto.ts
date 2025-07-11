import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsUUID,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum IssuePriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum IssueStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export class CreateIssueDto {
  @ApiProperty({
    description: 'Issue title',
    example: 'Implement user authentication',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  title: string;

  @ApiPropertyOptional({
    description: 'Issue description with markdown support',
    example: 'Implement JWT-based authentication with refresh tokens...',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 10000)
  description?: string;

  @ApiProperty({
    description: 'Issue priority level',
    enum: IssuePriority,
    example: IssuePriority.HIGH,
  })
  @IsEnum(IssuePriority)
  priority: IssuePriority;

  @ApiPropertyOptional({
    description: 'Initial issue status',
    enum: IssueStatus,
    example: IssueStatus.TODO,
    default: IssueStatus.TODO,
  })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @ApiPropertyOptional({
    description: 'User ID to assign this issue to',
    example: 'uuid-v4-string',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Cycle ID to associate this issue with',
    example: 'uuid-v4-string',
  })
  @IsOptional()
  @IsUUID()
  cycleId?: string;

  @ApiPropertyOptional({
    description: 'Parent issue ID for creating sub-issues',
    example: 'uuid-v4-string',
  })
  @IsOptional()
  @IsUUID()
  parentIssueId?: string;

  @ApiPropertyOptional({
    description: 'Time estimate in hours',
    example: 8,
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  estimate?: number;

  @ApiPropertyOptional({
    description: 'Story points for agile estimation',
    example: 5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  storyPoints?: number;

  @ApiPropertyOptional({
    description: 'Due date for the issue',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the issue',
    example: {
      tags: ['frontend', 'authentication'],
      complexity: 'high',
      reviewRequired: true,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
