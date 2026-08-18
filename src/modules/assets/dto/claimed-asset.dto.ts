import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from '../asset-status.enum';

export class ClaimedAsset {
  @ApiProperty({ description: 'Asset id', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Asset code', example: 'ASSET-0001' })
  code!: string;

  @ApiProperty({ description: 'Current asset status', enum: AssetStatus })
  status!: AssetStatus;

  @ApiProperty({
    description: 'When the asset was claimed',
    type: Date,
    nullable: true,
  })
  claimedAt!: Date;

  @ApiProperty({
    description: 'Optimistic concurrency version, incremented on every change',
    example: 2,
  })
  version!: number;
}
