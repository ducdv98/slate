import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidTimezone', async: false })
export class IsValidTimezoneConstraint implements ValidatorConstraintInterface {
  validate(timezone: string) {
    if (!timezone) return true; // Let optional validator handle empty values

    try {
      // Try to create a new Intl.DateTimeFormat with the timezone
      // This will throw an error if the timezone is invalid
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Invalid timezone. Please provide a valid IANA timezone identifier (e.g., "America/New_York", "Europe/London")';
  }
}

export function IsValidTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTimezoneConstraint,
    });
  };
}
