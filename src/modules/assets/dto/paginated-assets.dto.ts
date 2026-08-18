import { ApiProperty } from '@nestjs/swagger';
import { AssetListItem } from './asset-list-item.dto';

export class PaginatedAssetsDto {
  @ApiProperty({ description: 'Page of assets', type: () => [AssetListItem] })
  items!: AssetListItem[];

  @ApiProperty({ description: 'Total number of matching assets', example: 99 })
  total!: number;
}
