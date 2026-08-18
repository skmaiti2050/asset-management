import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from '../asset-status.enum';

export class AssetListItem {
  @ApiProperty({ description: 'Asset id', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Asset code', example: 'ASSET-0001' })
  code!: string;

  @ApiProperty({ description: 'Current asset status', enum: AssetStatus })
  status!: AssetStatus;

  @ApiProperty({
    description: 'Id of the user who claimed this asset, if any',
    format: 'uuid',
    nullable: true,
  })
  claimedBy!: string | null;

  @ApiProperty({
    description: 'When the asset was claimed, if claimed',
    type: Date,
    nullable: true,
  })
  claimedAt!: Date | null;

  @ApiProperty({
    description: 'When the claim expires, if set',
    type: Date,
    nullable: true,
  })
  expiresAt!: Date | null;

  @ApiProperty({
    description: 'Optimistic concurrency version, incremented on every change',
    example: 1,
  })
  version!: number;

  @ApiProperty({ description: 'Creation timestamp', type: Date })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', type: Date })
  updatedAt!: Date;
}
