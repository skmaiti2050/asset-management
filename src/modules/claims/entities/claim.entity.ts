import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClaimAction } from '../claim-action.enum';

@Entity('claims')
@Index('IDX_claims_user_created', ['userId', 'createdAt'])
@Index('IDX_claims_asset', ['assetId'])
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @Column({ type: 'varchar', length: 20 })
  action!: ClaimAction;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
