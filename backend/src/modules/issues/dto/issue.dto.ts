import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssuePriority, IssueStatus } from './create-issue.dto';

export class IssueAssigneeDto {
  @ApiProperty({
    description: 'User ID',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;
}

export class IssueProjectDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Mobile App Development',
  })
  name: string;
}

export class IssueCycleDto {
  @ApiProperty({
    description: 'Cycle ID',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'Cycle name',
    example: 'Sprint 1',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Cycle start date',
    example: '2024-01-01',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Cycle end date',
    example: '2024-01-14',
  })
  endDate?: string;
}

export class IssueParentDto {
  @ApiProperty({
    description: 'Parent issue ID',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'Parent issue title',
    example: 'Authentication Module',
  })
  title: string;
}

export class IssueDto {
  @ApiProperty({
    description: 'Issue ID',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'Project ID',
    example: 'uuid-v4-string',
  })
  projectId: string;

  @ApiProperty({
    description: 'Issue title',
    example: 'Implement user authentication',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Issue description',
    example: 'Implement JWT-based authentication with refresh tokens...',
  })
  description?: string;

  @ApiProperty({
    description: 'Issue priority',
    enum: IssuePriority,
    example: IssuePriority.HIGH,
  })
  priority: IssuePriority;

  @ApiProperty({
    description: 'Issue status',
    enum: IssueStatus,
    example: IssueStatus.TODO,
  })
  status: IssueStatus;

  @ApiPropertyOptional({
    description: 'Time estimate in hours',
    example: 8,
  })
  estimate?: number;

  @ApiPropertyOptional({
    description: 'Story points',
    example: 5,
  })
  storyPoints?: number;

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2024-12-31',
  })
  dueDate?: string;

  @ApiProperty({
    description: 'Issue creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Issue last update timestamp',
    example: '2024-01-02T00:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'User who created this issue',
    example: 'uuid-v4-string',
  })
  createdBy: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: {
      tags: ['frontend', 'authentication'],
      complexity: 'high',
    },
  })
  metadata?: Record<string, any>;

  // Related entities
  @ApiPropertyOptional({
    description: 'Assigned user details',
    type: IssueAssigneeDto,
  })
  assignee?: IssueAssigneeDto;

  @ApiPropertyOptional({
    description: 'Project details',
    type: IssueProjectDto,
  })
  project?: IssueProjectDto;

  @ApiPropertyOptional({
    description: 'Cycle details',
    type: IssueCycleDto,
  })
  cycle?: IssueCycleDto;

  @ApiPropertyOptional({
    description: 'Parent issue details',
    type: IssueParentDto,
  })
  parentIssue?: IssueParentDto;

  @ApiPropertyOptional({
    description: 'Number of child issues',
    example: 3,
  })
  childIssueCount?: number;

  @ApiPropertyOptional({
    description: 'Number of comments',
    example: 5,
  })
  commentCount?: number;

  @ApiPropertyOptional({
    description: 'Number of attachments',
    example: 2,
  })
  attachmentCount?: number;
}
