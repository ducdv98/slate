import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string) {
    if (!password) return false;

    // At least 8 characters long
    if (password.length < 8) return false;

    // Must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;

    // Must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) return false;

    // Must contain at least one number
    if (!/\d/.test(password)) return false;

    // Must contain at least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return false;

    return true;
  }

  defaultMessage() {
    return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
