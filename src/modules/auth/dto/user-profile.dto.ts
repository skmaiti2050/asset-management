import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/user-role.enum';

export class UserProfile {
  @ApiProperty({ description: 'User id', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'User email', format: 'email' })
  email!: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  role!: UserRole;

  @ApiProperty({ description: 'Registration timestamp', type: Date })
  createdAt!: Date;
}
