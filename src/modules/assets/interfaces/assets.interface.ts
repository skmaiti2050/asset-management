import { AssetStatus } from '../asset-status.enum';

export interface ClaimedAsset {
  id: string;
  code: string;
  status: AssetStatus;
  claimedAt: Date;
  version: number;
}

export interface PoolState {
  total: number;
  available: number;
  claimed: number;
  expired: number;
}

export interface AssetListItem {
  id: string;
  code: string;
  status: AssetStatus;
  claimedBy: string | null;
  claimedAt: Date | null;
  expiresAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateRow {
  id: string;
  code: string;
  status: AssetStatus;
  claimed_at: Date | null;
  version: number;
}
