import { IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../users/user-role.enum';

export class ChangeRoleDto {
  @IsString()
  @MinLength(8)
  secret!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
