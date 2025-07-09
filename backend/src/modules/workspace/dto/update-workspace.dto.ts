import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    description: 'Workspace name',
    example: 'My Updated Workspace',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Workspace description',
    example: 'Updated workspace description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
