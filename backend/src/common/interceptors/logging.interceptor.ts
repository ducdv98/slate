import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

interface AuthenticatedUser {
  sub?: string;
  id?: string;
  email?: string;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

interface LogContext {
  requestId: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  userId?: string;
  userEmail?: string;
  requestBody?: unknown;
  requestHeaders?: Record<string, string>;
  responseStatusCode?: number;
  responseTime?: number;
  responseSize?: number;
  errorMessage?: string;
  timestamp: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();
    const response = ctx.getResponse<Response>();

    // Extract request details
    const logContext = this.buildInitialLogContext(request, startTime);

    // Log incoming request
    this.logRequest(logContext);

    return next.handle().pipe(
      tap((responseData) => {
        // Calculate response metrics
        const responseTime = Date.now() - startTime;
        const responseSize = this.calculateResponseSize(responseData);

        // Update log context with response details
        const updatedContext: LogContext = {
          ...logContext,
          responseStatusCode: response.statusCode,
          responseTime,
          responseSize,
        };

        // Log successful response
        this.logResponse(updatedContext, 'success');
      }),
      catchError((error: Error & { status?: number }) => {
        // Calculate response time for errors
        const responseTime = Date.now() - startTime;

        // Update log context with error details
        const updatedContext: LogContext = {
          ...logContext,
          responseStatusCode: error.status ?? 500,
          responseTime,
          errorMessage: error.message || 'Unknown error',
        };

        // Log error response
        this.logResponse(updatedContext, 'error');

        // Re-throw the error
        throw error;
      }),
    );
  }

  private buildInitialLogContext(
    request: RequestWithUser,
    startTime: number,
  ): LogContext {
    const requestId = this.extractRequestId(request);

    // Extract user information if available (from JWT token)
    const user = request.user;

    // Filter sensitive headers
    const sanitizedHeaders = this.sanitizeHeaders(request.headers);

    return {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.get('user-agent') || 'Unknown',
      ip: this.extractClientIp(request),
      userId: user?.sub || user?.id,
      userEmail: user?.email,
      requestBody: this.sanitizeRequestBody(request.body),
      requestHeaders: sanitizedHeaders,
      timestamp: new Date(startTime).toISOString(),
    };
  }

  private extractRequestId(request: Request): string {
    // Try to get request ID from headers first (if set by load balancer or API gateway)
    const headerRequestId =
      request.get('x-request-id') || request.get('x-correlation-id');

    if (headerRequestId) {
      return headerRequestId;
    }

    // Generate a new request ID if not present
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private extractClientIp(request: Request): string {
    // Check for IP address in various headers (for proxied requests)
    const forwarded = request.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return (
      request.get('x-real-ip') ||
      request.get('x-client-ip') ||
      request.connection?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private sanitizeHeaders(
    headers: Record<string, any>,
  ): Record<string, string> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'set-cookie',
    ];

    const sanitized: Record<string, string> = {};

    Object.keys(headers).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(headers[key]);
      }
    });

    return sanitized;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Clone the body to avoid mutating the original
    const sanitized = { ...body };

    // List of sensitive fields to redact
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'authorization',
      'currentPassword',
      'newPassword',
      'confirmPassword',
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private calculateResponseSize(data: any): number {
    if (!data) return 0;

    try {
      if (Buffer.isBuffer(data)) {
        return data.length;
      }

      if (typeof data === 'string') {
        return Buffer.byteLength(data, 'utf8');
      }

      if (typeof data === 'object') {
        return Buffer.byteLength(JSON.stringify(data), 'utf8');
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  private logRequest(context: LogContext): void {
    const { method, url, userAgent, ip, userId, userEmail, requestId } =
      context;

    const message = `Incoming ${method} ${url}`;
    const logData = {
      type: 'request',
      requestId,
      method,
      url,
      userAgent,
      ip,
      userId,
      userEmail,
      timestamp: context.timestamp,
    };

    this.logger.log(message, logData);

    // Log request body for POST/PUT/PATCH requests (with sanitization)
    if (['POST', 'PUT', 'PATCH'].includes(method) && context.requestBody) {
      this.logger.debug('Request Body', {
        requestId,
        body: context.requestBody,
      });
    }
  }

  private logResponse(context: LogContext, type: 'success' | 'error'): void {
    const {
      method,
      url,
      responseStatusCode,
      responseTime,
      responseSize,
      requestId,
      errorMessage,
      userId,
    } = context;

    const message = `${method} ${url} - ${responseStatusCode} in ${responseTime}ms`;

    const logData = {
      type: 'response',
      requestId,
      method,
      url,
      statusCode: responseStatusCode,
      responseTime,
      responseSize,
      userId,
      timestamp: new Date().toISOString(),
    };

    if (type === 'error') {
      this.logger.error(`${message} - ${errorMessage}`, {
        ...logData,
        error: errorMessage,
      });
    } else {
      // Use different log levels based on status code
      if (responseStatusCode && responseStatusCode >= 400) {
        this.logger.warn(message, logData);
      } else {
        this.logger.log(message, logData);
      }
    }

    // Log slow requests (configurable threshold)
    if (responseTime && responseTime > 1000) {
      this.logger.warn(`Slow Request Detected: ${message}`, {
        ...logData,
        slow: true,
      });
    }
  }
}
