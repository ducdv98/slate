import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    // For development, use Ethereal Email (fake SMTP)
    // In production, configure with real SMTP settings
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';

    if (isDevelopment) {
      // Create test account for development
      void this.createTestTransporter();
    } else {
      // Production SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST') || 'localhost',
        port: this.configService.get<number>('SMTP_PORT') || 587,
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER') || '',
          pass: this.configService.get<string>('SMTP_PASS') || '',
        },
      });
    }
  }

  private async createTestTransporter() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.logger.log('Test email transporter created with Ethereal Email');
    } catch (error) {
      this.logger.error('Failed to create test transporter', error);
      // Fallback to console logging in development
      this.transporter = null;
    }
  }

  async sendVerificationEmail(email: string, verificationToken: string) {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM') || 'noreply@slate.dev',
      to: email,
      subject: 'Verify Your Email Address',
      html: this.getVerificationEmailTemplate(verificationUrl),
    };

    try {
      if (!this.transporter) {
        // Development fallback - log to console
        this.logger.log('Email would be sent to:', email);
        this.logger.log('Verification URL:', verificationUrl);
        return { success: true, messageId: 'dev-console-log' };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info = await this.transporter.sendMail(mailOptions);

      // Log preview URL for Ethereal Email in development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendInvitationEmail(invitationData: {
    email: string;
    inviterName: string;
    workspaceName: string;
    invitationToken: string;
    role: string;
  }) {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/join?token=${invitationData.invitationToken}`;

    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM') || 'noreply@slate.dev',
      to: invitationData.email,
      subject: `You're invited to join ${invitationData.workspaceName} on Slate`,
      html: this.getInvitationEmailTemplate(invitationData, invitationUrl),
    };

    try {
      if (!this.transporter) {
        // Development fallback - log to console
        this.logger.log(
          'Invitation email would be sent to:',
          invitationData.email,
        );
        this.logger.log('Invitation URL:', invitationUrl);
        this.logger.log('Inviter:', invitationData.inviterName);
        this.logger.log('Workspace:', invitationData.workspaceName);
        return { success: true, messageId: 'dev-console-log' };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info = await this.transporter.sendMail(mailOptions);

      // Log preview URL for Ethereal Email in development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error('Failed to send invitation email', error);
      throw new Error('Failed to send invitation email');
    }
  }

  private getVerificationEmailTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #dee2e6; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          .btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Slate!</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for signing up for Slate. To complete your registration, please verify your email address by clicking the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
            </p>
            <p>If you can't click the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${verificationUrl}
            </p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with Slate, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Slate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getInvitationEmailTemplate(
    invitationData: {
      email: string;
      inviterName: string;
      workspaceName: string;
      invitationToken: string;
      role: string;
    },
    invitationUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>You're Invited to Join ${invitationData.workspaceName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #dee2e6; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          .btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited to Join ${invitationData.workspaceName}</h1>
          </div>
          <div class="content">
            <p>${invitationData.inviterName} has invited you to join ${invitationData.workspaceName} on Slate.</p>
            <p>You have been invited with the role of "${invitationData.role}".</p>
            <p>To accept this invitation, please click the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" class="btn">Accept Invitation</a>
            </p>
            <p>If you don't want to join ${invitationData.workspaceName}, you can simply ignore this email.</p>
            <p>This invitation will expire in 7 days.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Slate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
