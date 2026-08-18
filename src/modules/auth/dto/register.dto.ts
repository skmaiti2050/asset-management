import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password (8-72 characters)',
    minLength: 8,
    maxLength: 72,
    example: 'password123',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
