import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingTier } from './create-workspace.dto';

export class WorkspaceMemberDto {
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

  @ApiProperty({
    description: 'User email',
    example: 'john@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'Membership role',
    enum: ['admin', 'member', 'guest'],
    example: 'member',
  })
  role: string;

  @ApiProperty({
    description: 'Membership status',
    enum: ['active', 'pending', 'suspended'],
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Date when user joined the workspace',
    example: '2024-01-15T10:30:00Z',
  })
  joinedAt: Date;
}

export class WorkspaceDto {
  @ApiProperty({
    description: 'Workspace ID',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'Workspace name',
    example: 'My Company Workspace',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Workspace description',
    example: 'Main workspace for tracking company projects',
  })
  description?: string;

  @ApiProperty({
    description: 'Workspace creation date',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Billing tier',
    enum: BillingTier,
    example: BillingTier.FREE,
  })
  billingTier: BillingTier;

  @ApiPropertyOptional({
    description: 'Current user membership in this workspace',
    type: WorkspaceMemberDto,
  })
  currentUserMembership?: WorkspaceMemberDto;

  @ApiPropertyOptional({
    description: 'Total number of members in workspace',
    example: 5,
  })
  memberCount?: number;

  @ApiPropertyOptional({
    description: 'Total number of projects in workspace',
    example: 12,
  })
  projectCount?: number;
}
