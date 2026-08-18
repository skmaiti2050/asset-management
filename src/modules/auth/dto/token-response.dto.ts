import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token (send as Bearer token)',
    example: 'eyJhbGciOi...',
  })
  accessToken!: string;
}
