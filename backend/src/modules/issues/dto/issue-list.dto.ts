import { ApiProperty } from '@nestjs/swagger';
import { IssueDto } from './issue.dto';

export class IssueListDto {
  @ApiProperty({
    description: 'Array of issues',
    type: [IssueDto],
  })
  data: IssueDto[];

  @ApiProperty({
    description: 'Total number of issues',
    example: 25,
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
    example: 3,
  })
  totalPages: number;
}
