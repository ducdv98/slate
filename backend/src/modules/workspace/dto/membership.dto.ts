import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
} from 'class-validator';

export enum MembershipRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'newmember@example.com',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited member',
    enum: MembershipRole,
    default: MembershipRole.MEMBER,
    example: MembershipRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole = MembershipRole.MEMBER;
}

export class UpdateMembershipDto {
  @ApiPropertyOptional({
    description: 'New role for the member',
    enum: MembershipRole,
    example: MembershipRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @ApiPropertyOptional({
    description: 'New status for the member',
    enum: MembershipStatus,
    example: MembershipStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}

export class WorkspaceMembersListDto {
  @ApiProperty({
    description: 'List of workspace members',
    type: [Object],
  })
  members: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: MembershipRole;
    status: MembershipStatus;
    joinedAt: Date;
    invitedAt?: Date;
    invitedBy?: {
      id: string;
      name: string;
      email: string;
    };
  }>;

  @ApiProperty({
    description: 'Total number of members',
    example: 5,
  })
  total: number;
}
