import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendVerificationEmailDto {
  @ApiProperty({
    description: 'Email address to send verification to',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class EmailVerificationResponseDto {
  @ApiProperty({
    description: 'Verification status message',
    example: 'Email verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Whether the email was successfully verified',
    example: true,
  })
  success: boolean;
}
