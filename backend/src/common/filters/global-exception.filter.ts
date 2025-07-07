import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';
import {
  ErrorResponse,
  ErrorCode,
  ValidationErrorDetail,
  DatabaseErrorDetail,
} from '../../shared/types/error.types';
import { ERROR_MESSAGES } from '../../shared/constants/error-messages.constants';

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate request ID for tracking
    const requestId = this.generateRequestId();

    // Log the exception
    this.logException(exception, request, requestId);

    // Build error response
    const errorResponse = this.buildErrorResponse(
      exception,
      request,
      requestId,
    );

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
    requestId: string,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, timestamp, path, requestId);
    }

    // Handle Prisma database exceptions
    if (this.isPrismaError(exception)) {
      return this.handlePrismaException(
        exception as
          | Prisma.PrismaClientKnownRequestError
          | Prisma.PrismaClientUnknownRequestError
          | Prisma.PrismaClientValidationError,
        timestamp,
        path,
        requestId,
      );
    }

    // Handle Throttler exceptions
    if (exception instanceof ThrottlerException) {
      return this.handleThrottlerException(
        exception,
        timestamp,
        path,
        requestId,
      );
    }

    // Handle unknown exceptions
    return this.handleUnknownException(exception, timestamp, path, requestId);
  }

  private handleHttpException(
    exception: HttpException,
    timestamp: string,
    path: string,
    requestId: string,
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let details: Record<string, any> | undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as HttpExceptionResponse;
      message = response.message || exception.message;

      // Handle validation errors
      if (response.message && Array.isArray(response.message)) {
        details = {
          validationErrors: this.parseValidationErrors(response.message),
        };
      }
    } else {
      message = exceptionResponse as string;
    }

    return {
      statusCode: status,
      message,
      error: this.getErrorNameByStatus(status),
      timestamp,
      path,
      requestId,
      details,
    };
  }

  private handlePrismaException(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientValidationError,
    timestamp: string,
    path: string,
    requestId: string,
  ): ErrorResponse {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaKnownError(exception, timestamp, path, requestId);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        error: ErrorCode.VALIDATION_FAILED,
        timestamp,
        path,
        requestId,
        details: {
          databaseError: {
            message: 'Invalid query parameters',
          },
        },
      };
    }

    // Unknown Prisma error
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: ERROR_MESSAGES.DATABASE_CONNECTION_ERROR,
      error: ErrorCode.DATABASE_CONNECTION_ERROR,
      timestamp,
      path,
      requestId,
    };
  }

  private handlePrismaKnownError(
    exception: Prisma.PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
    requestId: string,
  ): ErrorResponse {
    const details: DatabaseErrorDetail = {
      code: exception.code,
      message: exception.message,
    };

    if (exception.meta?.target) {
      details.target = exception.meta.target as string[];
    }

    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        return {
          statusCode: HttpStatus.CONFLICT,
          message: ERROR_MESSAGES.DUPLICATE_ENTRY,
          error: ErrorCode.DUPLICATE_ENTRY,
          timestamp,
          path,
          requestId,
          details: { databaseError: details },
        };

      case 'P2025': // Record not found
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: ERROR_MESSAGES.RESOURCE_NOT_FOUND,
          error: ErrorCode.RESOURCE_NOT_FOUND,
          timestamp,
          path,
          requestId,
          details: { databaseError: details },
        };

      case 'P2003': // Foreign key constraint violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: ERROR_MESSAGES.FOREIGN_KEY_CONSTRAINT,
          error: ErrorCode.FOREIGN_KEY_CONSTRAINT,
          timestamp,
          path,
          requestId,
          details: { databaseError: details },
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: ERROR_MESSAGES.DATABASE_CONNECTION_ERROR,
          error: ErrorCode.DATABASE_CONNECTION_ERROR,
          timestamp,
          path,
          requestId,
          details: { databaseError: details },
        };
    }
  }

  private handleThrottlerException(
    exception: ThrottlerException,
    timestamp: string,
    path: string,
    requestId: string,
  ): ErrorResponse {
    return {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      error: ErrorCode.RATE_LIMIT_EXCEEDED,
      timestamp,
      path,
      requestId,
    };
  }

  private handleUnknownException(
    exception: unknown,
    timestamp: string,
    path: string,
    requestId: string,
  ): ErrorResponse {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error: ErrorCode.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      requestId,
    };
  }

  private parseValidationErrors(messages: string[]): ValidationErrorDetail[] {
    return messages.map((message) => {
      // Parse validation error message format: "field should not be empty"
      const parts = message.split(' ');
      const field = parts[0] || 'unknown';

      return {
        field,
        value: undefined,
        constraints: {
          validation: message,
        },
      };
    });
  }

  private getErrorNameByStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      default:
        return 'Unknown Error';
    }
  }

  private isPrismaError(exception: unknown): boolean {
    return (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientValidationError
    );
  }

  private logException(
    exception: unknown,
    request: Request,
    requestId: string,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    const logContext = {
      requestId,
      method,
      url,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      if (status >= 500) {
        this.logger.error(`HTTP ${status} Error: ${exception.message}`, {
          ...logContext,
          statusCode: status,
          stack: exception.stack,
        });
      } else if (status >= 400) {
        this.logger.warn(`HTTP ${status} Error: ${exception.message}`, {
          ...logContext,
          statusCode: status,
        });
      }
    } else if (this.isPrismaError(exception)) {
      this.logger.error(`Database Error: ${(exception as Error).message}`, {
        ...logContext,
        errorCode: (exception as Prisma.PrismaClientKnownRequestError).code,
        stack: (exception as Error).stack,
      });
    } else {
      this.logger.error(
        `Unhandled Exception: ${(exception as Error).message}`,
        {
          ...logContext,
          stack: (exception as Error).stack,
        },
      );
    }
  }

  private generateRequestId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
