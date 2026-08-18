import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssetStatus } from '../asset-status.enum';

export interface AssetRow {
  id: string;
  code: string;
  status: AssetStatus;
  claimed_at: Date | null;
  version: number;
}

@Entity('assets')
@Index('IDX_assets_status', ['status'])
@Index('IDX_assets_claimed_by', ['claimedBy'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 20, default: AssetStatus.AVAILABLE })
  status!: AssetStatus;

  @Column({ name: 'claimed_by', type: 'uuid', nullable: true })
  claimedBy!: string | null;

  @Column({ name: 'claimed_at', type: 'timestamptz', nullable: true })
  claimedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
