import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { PrismaService } from '../../core/database/prisma.service';

@ValidatorConstraint({ name: 'isUniqueEmail', async: true })
@Injectable()
export class IsUniqueEmailConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(email: string) {
    if (!email) return true; // Let required validator handle empty values

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return !user; // Return true if user doesn't exist (email is unique)
  }

  defaultMessage() {
    return 'Email is already registered';
  }
}

export function IsUniqueEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUniqueEmailConstraint,
    });
  };
}
