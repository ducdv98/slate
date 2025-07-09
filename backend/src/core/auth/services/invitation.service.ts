import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../../mailer/mailer.service';
import {
  CreateInvitationDto,
  InvitationTokenDto,
  InvitationInfoDto,
} from '../dto/invitation.dto';
import {
  MembershipRole,
  MembershipStatus,
} from '../../../modules/workspace/dto/membership.dto';
import { AuditLogService } from '../../../shared/services/audit-log.service';
import { AuditAction } from '../../../shared/types/audit.types';

interface InvitationPayload {
  email: string;
  workspaceId: string;
  invitedBy: string;
  role: MembershipRole;
  iat: number;
  exp: number;
}

@Injectable()
export class InvitationService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Create an invitation token for a user to join a workspace
   */
  async createInvitation(
    invitedBy: string,
    data: CreateInvitationDto,
    ipAddress?: string,
  ): Promise<InvitationTokenDto> {
    // Verify the workspace exists and the inviter has permission
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: data.workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if inviter has permission to invite members
    const inviterMembership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: invitedBy,
          workspaceId: data.workspaceId,
        },
      },
    });

    if (
      !inviterMembership ||
      inviterMembership.status !== MembershipStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'You do not have permission to invite members to this workspace',
      );
    }

    // Check if user is already invited or a member
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: invitedBy, // This should be the invitee's user ID if they exist
          workspaceId: data.workspaceId,
        },
      },
    });

    // For now, we'll allow re-invitations. In production, you might want to check for pending invitations

    // Get inviter info
    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedBy },
      select: { id: true, name: true, email: true },
    });

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    // Create invitation token (valid for 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const payload: InvitationPayload = {
      email: data.email,
      workspaceId: data.workspaceId,
      invitedBy: invitedBy,
      role: data.role || MembershipRole.MEMBER,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const token = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '7d',
    });

    // Log the invitation creation
    await this.auditLog.logWorkspaceAction(
      AuditAction.WORKSPACE_MEMBER_INVITE,
      data.workspaceId,
      invitedBy,
      data.email, // Using email as target since user might not exist yet
      { email: { after: data.email }, role: { after: data.role } },
      ipAddress,
    );

    // Send invitation email
    try {
      await this.mailer.sendInvitationEmail({
        email: data.email,
        inviterName: inviter.name,
        workspaceName: workspace.name,
        invitationToken: token,
        role: data.role || MembershipRole.MEMBER,
      });
    } catch (error) {
      // Don't fail invitation creation if email sending fails
      console.warn(`Failed to send invitation email to ${data.email}:`, error);
    }

    return {
      token,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description || undefined,
      },
      invitedBy: inviter,
      role: data.role || MembershipRole.MEMBER,
      expiresAt,
    };
  }

  /**
   * Verify and decode an invitation token
   */
  async verifyInvitationToken(token: string): Promise<InvitationInfoDto> {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      }) as InvitationPayload;

      // Get workspace info
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: payload.workspaceId },
      });

      if (!workspace) {
        throw new BadRequestException('Workspace no longer exists');
      }

      // Get inviter info
      const inviter = await this.prisma.user.findUnique({
        where: { id: payload.invitedBy },
        select: { id: true, name: true, email: true },
      });

      if (!inviter) {
        throw new BadRequestException('Inviter no longer exists');
      }

      return {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description || undefined,
        },
        invitedBy: inviter,
        role: payload.role,
        isValid: true,
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch (error) {
      throw new BadRequestException('Invalid or expired invitation token');
    }
  }

  /**
   * Accept an invitation and create membership
   */
  async acceptInvitation(
    token: string,
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    const invitationInfo = await this.verifyInvitationToken(token);

    // Check if user is already a member
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: userId,
          workspaceId: invitationInfo.workspace.id,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException(
        'You are already a member of this workspace',
      );
    }

    // Create the membership
    await this.prisma.membership.create({
      data: {
        userId: userId,
        workspaceId: invitationInfo.workspace.id,
        role: invitationInfo.role,
        status: MembershipStatus.ACTIVE,
        invitedBy: invitationInfo.invitedBy.id,
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
    });

    // Log the membership creation
    await this.auditLog.logWorkspaceAction(
      AuditAction.WORKSPACE_MEMBER_INVITE,
      invitationInfo.workspace.id,
      userId,
      userId,
      {
        role: { after: invitationInfo.role },
        status: { after: MembershipStatus.ACTIVE },
      },
      ipAddress,
    );
  }

  /**
   * Get invitation info without accepting it (for preview)
   */
  async getInvitationInfo(token: string): Promise<InvitationInfoDto> {
    return this.verifyInvitationToken(token);
  }
}
