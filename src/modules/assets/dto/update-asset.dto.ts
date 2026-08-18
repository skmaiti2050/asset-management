import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAssetDto {
  @ApiProperty({
    description:
      'Current asset version (required for optimistic concurrency control)',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({
    description:
      'New expiration date (ISO 8601). Omit or set to null to clear expiry.',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
