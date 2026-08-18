import { ApiProperty } from '@nestjs/swagger';

export class PoolState {
  @ApiProperty({
    description: 'Total number of assets in the pool',
    example: 10,
  })
  total!: number;

  @ApiProperty({
    description: 'Assets currently available to claim',
    example: 6,
  })
  available!: number;

  @ApiProperty({ description: 'Assets currently claimed', example: 3 })
  claimed!: number;

  @ApiProperty({ description: 'Assets that have expired', example: 1 })
  expired!: number;
}
