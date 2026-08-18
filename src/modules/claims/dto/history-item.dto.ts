import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from '../../assets/asset-status.enum';
import { ClaimAction } from '../claim-action.enum';

export class HistoryItem {
  @ApiProperty({ description: 'History entry id', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'What happened to the asset', enum: ClaimAction })
  action!: ClaimAction;

  @ApiProperty({ description: 'When the action happened', type: Date })
  createdAt!: Date;

  @ApiProperty({ description: 'Email of the user who acted', format: 'email' })
  userEmail!: string;

  @ApiProperty({
    description: 'Code of the affected asset',
    example: 'ASSET-0001',
  })
  assetCode!: string;

  @ApiProperty({
    description: 'Asset status at the time of the action',
    enum: AssetStatus,
  })
  assetStatus!: AssetStatus;
}
