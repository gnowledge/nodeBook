import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Username or email', example: 'user@example.com' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Username', example: 'johndoe' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class CallbackDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Redirect URI', required: false })
  @IsOptional()
  @IsString()
  redirect_uri?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password', example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Verification token' })
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({ description: 'Username', example: 'johndoe' })
  @IsString()
  username: string;
}

