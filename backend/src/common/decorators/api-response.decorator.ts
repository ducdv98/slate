import { SetMetadata } from '@nestjs/common';

// Metadata keys
export const API_RESPONSE_MESSAGE = 'api_response_message';
export const API_RESPONSE_SUCCESS_CODE = 'api_response_success_code';

/**
 * Decorator to set a custom success message for the response
 */
export const ApiSuccessResponse = (message: string) =>
  SetMetadata(API_RESPONSE_MESSAGE, message);

/**
 * Decorator to set a custom success status code for the response
 */
export const ApiSuccessCode = (statusCode: number) =>
  SetMetadata(API_RESPONSE_SUCCESS_CODE, statusCode);

/**
 * Decorator to set both message and status code for created resources
 */
export const ApiCreatedResponse = (
  message: string = 'Resource created successfully',
) => SetMetadata(API_RESPONSE_MESSAGE, message);

/**
 * Decorator to set both message and status code for updated resources
 */
export const ApiUpdatedResponse = (
  message: string = 'Resource updated successfully',
) => SetMetadata(API_RESPONSE_MESSAGE, message);

/**
 * Decorator to set both message and status code for deleted resources
 */
export const ApiDeletedResponse = (
  message: string = 'Resource deleted successfully',
) => SetMetadata(API_RESPONSE_MESSAGE, message);
