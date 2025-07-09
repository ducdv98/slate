import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipRole } from '../../../shared/constants/permissions.constants';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address to invite',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Workspace ID to invite user to',
    example: 'workspace-uuid-123',
  })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({
    description: 'Role to assign to the invited user',
    enum: MembershipRole,
    default: MembershipRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @ApiPropertyOptional({
    description: 'Personal message to include in invitation',
    example: 'Welcome to our team workspace!',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class InvitationTokenDto {
  @ApiProperty({
    description: 'Invitation token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Workspace information',
  })
  workspace: {
    id: string;
    name: string;
    description?: string;
  };

  @ApiProperty({
    description: 'Inviter information',
  })
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Role to be assigned',
    enum: MembershipRole,
  })
  role: MembershipRole;

  @ApiProperty({
    description: 'Expiration date of invitation',
  })
  expiresAt: Date;
}

export class SignupWithInvitationDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Invitation token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  invitationToken: string;
}

export class SignupWithWorkspaceDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Initial workspace name',
    example: 'My Company',
  })
  @IsString()
  workspaceName: string;

  @ApiPropertyOptional({
    description: 'Initial workspace description',
    example: 'Our main workspace for project management',
  })
  @IsOptional()
  @IsString()
  workspaceDescription?: string;
}

export class InvitationInfoDto {
  @ApiProperty({
    description: 'Workspace information',
  })
  workspace: {
    id: string;
    name: string;
    description?: string;
  };

  @ApiProperty({
    description: 'Inviter information',
  })
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Role to be assigned',
    enum: MembershipRole,
  })
  role: MembershipRole;

  @ApiProperty({
    description: 'Whether the invitation is valid',
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Expiration date of invitation',
  })
  expiresAt: Date;
}
