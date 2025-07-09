import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceEntity {
  @ApiProperty({
    description: 'Unique identifier for the workspace',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the workspace',
    example: 'My Company Workspace',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the workspace',
    example: 'Main workspace for tracking company projects',
  })
  description?: string;

  @ApiProperty({
    description: 'Date when the workspace was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Billing tier of the workspace',
    example: 'free',
  })
  billingTier: string;
}
