import { AssetStatus } from '../../assets/asset-status.enum';
import { ClaimAction } from '../claim-action.enum';

export interface HistoryItem {
  id: string;
  action: ClaimAction;
  createdAt: Date;
  userEmail: string;
  assetCode: string;
  assetStatus: AssetStatus;
}

export interface HistoryRow {
  id: string;
  action: ClaimAction;
  createdAt: Date;
  userEmail: string;
  assetCode: string;
  assetStatus: AssetStatus;
}
