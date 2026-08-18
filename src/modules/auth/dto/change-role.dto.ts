import { IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/user-role.enum';

export class ChangeRoleDto {
  @ApiProperty({
    description: 'Shared secret that authorizes changing your own role',
    minLength: 8,
    example: 'change-me',
  })
  @IsString()
  @MinLength(8)
  secret!: string;

  @ApiProperty({ enum: UserRole, description: 'Role to assign to yourself' })
  @IsEnum(UserRole)
  role!: UserRole;
}
