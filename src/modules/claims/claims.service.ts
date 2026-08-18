import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetStatus } from '../assets/asset-status.enum';
import { Asset } from '../assets/entities/asset.entity';
import { User } from '../users/entities/user.entity';
import { ClaimAction } from './claim-action.enum';
import { HistoryItem } from './dto/history-item.dto';
import { Claim } from './entities/claim.entity';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(Claim)
    private readonly claimRepository: Repository<Claim>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async getHistory(
    userId: string,
    action: ClaimAction | undefined,
    skip: number,
    limit: number,
  ): Promise<{ items: HistoryItem[]; total: number }> {
    const query = this.claimRepository
      .createQueryBuilder('claim')
      .select('claim.id', 'id')
      .addSelect('claim.action', 'action')
      .addSelect('claim.createdAt', 'createdAt')
      .addSelect('user.email', 'userEmail')
      .addSelect('asset.code', 'assetCode')
      .addSelect('asset.status', 'assetStatus')
      .leftJoin(User, 'user', 'user.id = claim.userId')
      .leftJoin(Asset, 'asset', 'asset.id = claim.assetId')
      .where('claim.userId = :userId', { userId })
      .orderBy('claim.createdAt', 'DESC');

    if (action) {
      query.andWhere('claim.action = :action', { action });
    }

    const [items, total] = await Promise.all([
      query.clone().skip(skip).take(limit).getRawMany<HistoryItem>(),
      query.getCount(),
    ]);

    return { items, total };
  }

  async getCurrentAssets(
    userId: string,
    skip: number,
    limit: number,
  ): Promise<{ items: Asset[]; total: number }> {
    const [items, total] = await this.assetRepository.findAndCount({
      where: { claimedBy: userId, status: AssetStatus.CLAIMED },
      order: { claimedAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total };
  }
}
