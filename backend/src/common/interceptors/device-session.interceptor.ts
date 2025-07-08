import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request as ExpressRequest } from 'express';
import { DeviceSessionService } from '../../modules/users/device-session.service';

interface AuthenticatedUser {
  id: string;
  email: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user?: AuthenticatedUser;
}

@Injectable()
export class DeviceSessionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DeviceSessionInterceptor.name);

  constructor(private readonly deviceSessionService: DeviceSessionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Only process authenticated requests
    if (!request.user?.id) {
      return next.handle();
    }

    // Extract device session data
    const deviceSessionData = this.extractDeviceSessionData(request);

    return next.handle().pipe(
      tap({
        next: () => {
          // Update device session activity on successful requests
          void this.updateDeviceSessionActivity(
            request.user.id,
            deviceSessionData,
          );
        },
        error: () => {
          // Still update activity even on errors (user was authenticated)
          void this.updateDeviceSessionActivity(
            request.user.id,
            deviceSessionData,
          );
        },
      }),
    );
  }

  private extractDeviceSessionData(request: AuthenticatedRequest): {
    deviceToken: string;
    deviceType: 'ios' | 'android' | 'web';
    userAgent?: string;
  } {
    const userAgent = request.get('user-agent') || '';

    // Determine device type from user agent
    let deviceType: 'ios' | 'android' | 'web' = 'web';
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      deviceType =
        userAgent.includes('iPhone') || userAgent.includes('iOS')
          ? 'ios'
          : 'android';
    }

    // Generate device token (combination of IP + User Agent hash)
    const deviceToken = Buffer.from(`${this.getClientIp(request)}-${userAgent}`)
      .toString('base64')
      .slice(0, 32);

    return {
      deviceToken,
      deviceType,
      userAgent: userAgent || undefined,
    };
  }

  private getClientIp(request: AuthenticatedRequest): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      'unknown'
    );
  }

  private async updateDeviceSessionActivity(
    userId: string,
    deviceSessionData: { deviceToken: string },
  ): Promise<void> {
    try {
      await this.deviceSessionService.updateLastActive(
        userId,
        deviceSessionData.deviceToken,
      );
    } catch (error) {
      // Log but don't fail the request
      this.logger.warn(
        `Failed to update device session activity for user ${userId}:`,
        error,
      );
    }
  }
}
