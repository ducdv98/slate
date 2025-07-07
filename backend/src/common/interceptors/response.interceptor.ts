import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ApiResponse } from '../../shared/types/response.types';
import { ResponseUtil } from '../../shared/utils/response.util';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Generate request ID
    const requestId = this.generateRequestId();

    return next.handle().pipe(
      map((data: unknown) => {
        // If the response is already in our standard format, just add metadata
        if (this.isApiResponse(data)) {
          return ResponseUtil.withRequestId(data, requestId);
        }

        // If it's a file stream or special response, return as-is
        if (this.isSpecialResponse(data)) {
          return data;
        }

        // Transform to standard format
        const statusCode = response.statusCode || HttpStatus.OK;
        const executionTime = Date.now() - startTime;

        return ResponseUtil.success(data, undefined, statusCode, {
          requestId,
          performance: {
            executionTime,
            cacheHit: false,
          },
        });
      }),
    );
  }

  private isApiResponse(data: unknown): data is ApiResponse {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;
    return (
      typeof obj.success === 'boolean' &&
      typeof obj.statusCode === 'number' &&
      Object.prototype.hasOwnProperty.call(obj, 'data')
    );
  }

  private isSpecialResponse(data: unknown): boolean {
    // Check for file streams, buffers, or other special responses
    if (!data) return false;

    // File streams
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.pipe && typeof obj.pipe === 'function') {
        return true;
      }
    }

    // Buffers
    if (Buffer.isBuffer(data)) {
      return true;
    }

    // Already transformed responses (like redirects)
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.url && obj.statusCode) {
        return true;
      }
    }

    return false;
  }

  private generateRequestId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
