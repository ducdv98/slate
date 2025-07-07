# API Response Standardization

This document explains how to use the standardized API response system in the Slate backend.

## Overview

All API responses are automatically standardized to provide a consistent format for frontend integration. The system includes:

- **Automatic response transformation** via global interceptor
- **Consistent error handling** via global exception filter
- **Helper utilities** for creating standardized responses
- **Type safety** with TypeScript interfaces

## Standard Response Format

### Success Response
```typescript
{
  success: true,
  statusCode: 200,
  message: "Operation completed successfully",
  data: T, // Your actual response data
  meta: {
    timestamp: "2024-01-15T10:30:45.123Z",
    requestId: "abc123def456",
    performance?: {
      executionTime: 15,
      cacheHit: false
    },
    pagination?: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrevious: false
    }
  }
}
```

### Error Response
```typescript
{
  statusCode: 400,
  message: "Validation failed",
  error: "VALIDATION_FAILED",
  timestamp: "2024-01-15T10:30:45.123Z",
  path: "/api/users",
  requestId: "abc123def456",
  details?: {
    // Additional error context
  }
}
```

## Usage Methods

### 1. Automatic Transformation (Recommended)

Just return your data directly from controllers. The `ResponseInterceptor` will automatically wrap it:

```typescript
@Get('users/:id')
async getUser(@Param('id') id: string): Promise<User> {
  const user = await this.userService.findById(id);
  return user; // Automatically transformed to standardized format
}
```

### 2. Manual Response Creation

Use `ResponseUtil` for more control:

```typescript
import { ResponseUtil } from '../shared/utils/response.util';

@Post('users')
async createUser(@Body() dto: CreateUserDto): Promise<ApiResponse<User>> {
  const user = await this.userService.create(dto);
  return ResponseUtil.created(user, 'User created successfully');
}
```

### 3. Paginated Responses

```typescript
@Get('users')
async getUsers(
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '10'
): Promise<PaginatedApiResponse<User>> {
  const { users, total } = await this.userService.findMany({ page, limit });
  const pagination = ResponseUtil.createPaginationFromQuery(total, page, limit);
  
  return ResponseUtil.paginated(users, pagination, 'Users retrieved successfully');
}
```

## ResponseUtil Methods

### Basic Operations
- `ResponseUtil.success(data, message?, statusCode?, meta?)` - Generic success response
- `ResponseUtil.created(data, message?, meta?)` - 201 Created response
- `ResponseUtil.updated(data, message?, meta?)` - 200 Updated response
- `ResponseUtil.deleted(message?, meta?)` - 200 Deleted response (null data)

### Pagination
- `ResponseUtil.paginated(items, paginationMeta, message?, additionalMeta?)` - Paginated response
- `ResponseUtil.createPaginationFromQuery(total, page, limit)` - Create pagination metadata
- `ResponseUtil.calculatePagination(total, page, limit)` - Calculate pagination details

### Performance Tracking
- `ResponseUtil.withPerformance(data, startTime, cacheHit?, message?, statusCode?)` - Add performance metrics
- `ResponseUtil.withRequestId(response, requestId)` - Add request ID to existing response

## Decorators (Optional)

Use decorators to set custom success messages:

```typescript
import { 
  ApiCreatedResponse, 
  ApiUpdatedResponse, 
  ApiDeletedResponse,
  ApiSuccessResponse 
} from '../common/decorators';

@Post('users')
@ApiCreatedResponse('User account created successfully')
async createUser(@Body() dto: CreateUserDto) {
  // Your implementation
}

@Put('users/:id')
@ApiUpdatedResponse('User profile updated successfully')
async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
  // Your implementation
}
```

## Error Handling

Errors are automatically handled by the `GlobalExceptionFilter`. Just throw standard exceptions:

```typescript
import { NotFoundException, BadRequestException } from '@nestjs/common';

@Get('users/:id')
async getUser(@Param('id') id: string) {
  const user = await this.userService.findById(id);
  if (!user) {
    throw new NotFoundException('User not found'); // Automatically standardized
  }
  return user;
}
```

## Types

Import types for proper TypeScript support:

```typescript
import { 
  ApiResponse, 
  PaginatedApiResponse, 
  ResponseMeta,
  PaginationMeta,
  SUCCESS_MESSAGES 
} from '../shared/types/response.types';
```

## Best Practices

1. **Use automatic transformation** for simple responses
2. **Use ResponseUtil methods** for complex responses or when you need specific status codes
3. **Always handle errors** with proper HTTP exceptions
4. **Use pagination** for list endpoints that could return large datasets
5. **Include meaningful messages** to help frontend developers
6. **Leverage TypeScript types** for better development experience

## Frontend Integration

Frontend developers can expect all responses to follow this format:

```typescript
// Frontend TypeScript interface
interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
    performance?: PerformanceMeta;
  };
}

// Usage example
const response = await fetch('/api/users/1');
const result: ApiResponse<User> = await response.json();

if (result.success) {
  console.log('User:', result.data);
  console.log('Execution time:', result.meta?.performance?.executionTime);
} else {
  console.error('Error:', result.message);
}
```

This standardization ensures consistent API behavior and makes frontend integration much easier and more predictable. 