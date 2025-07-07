import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntOptionalPipe
  implements PipeTransform<string, number | undefined>
{
  transform(value: string | undefined): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('Invalid number format');
    }
    return val;
  }
}
