import { ApiProperty } from '@nestjs/swagger';
import { ProjectDto } from './project.dto';

export class ProjectListDto {
  @ApiProperty({
    description: 'List of projects',
    type: [ProjectDto],
  })
  data: ProjectDto[];

  @ApiProperty({
    description: 'Total number of projects',
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}
