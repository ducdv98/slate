import { HttpStatus } from '@nestjs/common';
import {
  ApiResponse,
  PaginatedApiResponse,
  PaginationMeta,
  ResponseMeta,
  SUCCESS_MESSAGES,
} from '../types/response.types';

export class ResponseUtil {
  /**
   * Create a successful API response
   */
  static success<T>(
    data: T,
    message?: string,
    statusCode: number = HttpStatus.OK,
    meta?: Partial<ResponseMeta>,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message: message || SUCCESS_MESSAGES.SUCCESS,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Create a successful response for resource creation
   */
  static created<T>(
    data: T,
    message?: string,
    meta?: Partial<ResponseMeta>,
  ): ApiResponse<T> {
    return this.success(
      data,
      message || SUCCESS_MESSAGES.CREATED,
      HttpStatus.CREATED,
      meta,
    );
  }

  /**
   * Create a successful response for resource updates
   */
  static updated<T>(
    data: T,
    message?: string,
    meta?: Partial<ResponseMeta>,
  ): ApiResponse<T> {
    return this.success(
      data,
      message || SUCCESS_MESSAGES.UPDATED,
      HttpStatus.OK,
      meta,
    );
  }

  /**
   * Create a successful response for resource deletion
   */
  static deleted(
    message?: string,
    meta?: Partial<ResponseMeta>,
  ): ApiResponse<null> {
    return this.success(
      null,
      message || SUCCESS_MESSAGES.DELETED,
      HttpStatus.OK,
      meta,
    );
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    items: T[],
    paginationMeta: PaginationMeta,
    message?: string,
    additionalMeta?: Partial<ResponseMeta>,
  ): PaginatedApiResponse<T> {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: message || SUCCESS_MESSAGES.SUCCESS,
      data: items,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: paginationMeta,
        ...additionalMeta,
      },
    };
  }

  /**
   * Calculate pagination metadata
   */
  static calculatePagination(
    total: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Create pagination metadata from query parameters
   */
  static createPaginationFromQuery(
    total: number,
    page: string | number = 1,
    limit: string | number = 10,
  ): PaginationMeta {
    const parsedPage = Math.max(1, Number(page));
    const parsedLimit = Math.min(100, Math.max(1, Number(limit))); // Cap at 100 items

    return this.calculatePagination(total, parsedPage, parsedLimit);
  }

  /**
   * Create a response with performance metadata
   */
  static withPerformance<T>(
    data: T,
    startTime: number,
    cacheHit: boolean = false,
    message?: string,
    statusCode: number = HttpStatus.OK,
  ): ApiResponse<T> {
    const executionTime = Date.now() - startTime;

    return this.success(data, message, statusCode, {
      performance: {
        executionTime,
        cacheHit,
      },
    });
  }

  /**
   * Add request ID to response metadata
   */
  static withRequestId<T>(
    response: ApiResponse<T>,
    requestId: string,
  ): ApiResponse<T> {
    return {
      ...response,
      meta: {
        ...response.meta,
        requestId,
      },
    };
  }
}
