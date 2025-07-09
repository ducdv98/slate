import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export enum BillingTier {
  FREE = 'free',
  TEAM = 'team',
  ENTERPRISE = 'enterprise',
}

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Workspace name',
    example: 'My Company Workspace',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: 'Workspace description',
    example: 'Main workspace for tracking company projects',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
