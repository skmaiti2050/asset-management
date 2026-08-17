import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ClaimAction } from '../claims/claim-action.enum';
import { Claim } from '../claims/entities/claim.entity';
import { AssetStatus } from './asset-status.enum';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset } from './entities/asset.entity';
import {
  AssetListItem,
  ClaimedAsset,
  PoolState,
  UpdateRow,
} from './interfaces/assets.interface';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    private readonly dataSource: DataSource,
  ) {}

  // ----- reads -----

  async getPoolState(): Promise<PoolState> {
    const rows = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.status')
      .getRawMany<{ status: AssetStatus; count: string }>();

    const counts: Record<AssetStatus, number> = {
      [AssetStatus.AVAILABLE]: 0,
      [AssetStatus.CLAIMED]: 0,
      [AssetStatus.EXPIRED]: 0,
    };
    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }

    return {
      total: counts.available + counts.claimed + counts.expired,
      available: counts.available,
      claimed: counts.claimed,
      expired: counts.expired,
    };
  }

  async list(
    status: AssetStatus | undefined,
    skip: number,
    limit: number,
  ): Promise<{ items: AssetListItem[]; total: number }> {
    const [assets, total] = await this.assetRepository.findAndCount({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items: assets.map((asset) => this.toListItem(asset)), total };
  }

  async findByIdOrFail(id: string): Promise<AssetListItem> {
    const asset = await this.assetRepository.findOneBy({ id });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return this.toListItem(asset);
  }

  // ----- claim / release (concurrency-safe) -----

  claim(userId: string, assetId: string): Promise<ClaimedAsset> {
    return this.dataSource.transaction(async (manager) => {
      const claimed = await this.tryClaim(manager, userId, assetId);
      if (!claimed) {
        await this.ensureClaimable(manager, assetId);
        throw new ConflictException('Asset is not available to claim');
      }
      return claimed;
    });
  }

  claimAny(userId: string): Promise<ClaimedAsset> {
    return this.dataSource.transaction(async (manager) => {
      const [row] = await manager.query<{ id: string }[]>(
        `SELECT "id" FROM "assets"
         WHERE "status" = $1 AND ("expires_at" IS NULL OR "expires_at" > now())
         ORDER BY "id"
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        [AssetStatus.AVAILABLE],
      );

      if (!row) {
        throw new ConflictException('No assets available to claim');
      }

      const claimed = await this.tryClaim(manager, userId, row.id);
      if (!claimed) {
        throw new ConflictException('No assets available to claim');
      }
      return claimed;
    });
  }

  release(userId: string, assetId: string): Promise<ClaimedAsset> {
    return this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(Asset)
        .set({
          status: AssetStatus.AVAILABLE,
          claimedBy: null,
          claimedAt: null,
          version: () => '"version" + 1',
          updatedAt: () => 'CURRENT_TIMESTAMP',
        })
        .where('id = :id AND status = :claimed AND claimedBy = :userId', {
          id: assetId,
          claimed: AssetStatus.CLAIMED,
          userId,
        })
        .returning(['id', 'code', 'status', 'claimedAt', 'version'])
        .execute();

      const raw = result.raw as UpdateRow[];
      if (!raw?.length) {
        await this.ensureReleaseable(manager, assetId, userId);
        throw new ConflictException('Asset is not claimed by you');
      }

      await manager.insert(Claim, {
        userId,
        assetId,
        action: ClaimAction.RELEASE,
      });

      return this.toClaimedAsset(raw[0]);
    });
  }

  /**
   * Single atomic conditional UPDATE: only one concurrent caller can win the row
   * lock, the rest re-evaluate the WHERE clause and get 0 rows.
   */
  private async tryClaim(
    manager: EntityManager,
    userId: string,
    assetId: string,
  ): Promise<ClaimedAsset | null> {
    const result = await manager
      .createQueryBuilder()
      .update(Asset)
      .set({
        status: AssetStatus.CLAIMED,
        claimedBy: userId,
        claimedAt: () => 'CURRENT_TIMESTAMP',
        version: () => '"version" + 1',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where(
        'id = :id AND status = :available AND (expiresAt IS NULL OR expiresAt > now())',
        { id: assetId, available: AssetStatus.AVAILABLE },
      )
      .returning(['id', 'code', 'status', 'claimedAt', 'version'])
      .execute();

    const raw = result.raw as UpdateRow[];
    if (!raw?.length) {
      return null;
    }

    await manager.insert(Claim, {
      userId,
      assetId,
      action: ClaimAction.CLAIM,
    });

    return this.toClaimedAsset(raw[0]);
  }

  // ----- error classification for failed transitions -----

  private async ensureClaimable(
    manager: EntityManager,
    assetId: string,
  ): Promise<void> {
    const asset = await manager.getRepository(Asset).findOneBy({ id: assetId });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    if (asset.expiresAt && asset.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('Asset has expired');
    }
    throw new ConflictException('Asset is not available to claim');
  }

  private async ensureReleaseable(
    manager: EntityManager,
    assetId: string,
    userId: string,
  ): Promise<void> {
    const asset = await manager.getRepository(Asset).findOneBy({ id: assetId });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    if (asset.status !== AssetStatus.CLAIMED) {
      throw new ConflictException('Asset is not currently claimed');
    }
    if (asset.claimedBy !== userId) {
      throw new ForbiddenException(
        'You cannot release an asset claimed by another user',
      );
    }
  }

  // ----- admin operations -----

  async createMany(codes: string[]): Promise<{ created: number }> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(
          Asset,
          codes.map((code) => ({ code })),
        );
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('One or more codes already exist');
      }
      throw error;
    }
    return { created: codes.length };
  }

  async update(id: string, dto: UpdateAssetDto): Promise<AssetListItem> {
    const set: Record<string, unknown> = {
      version: () => '"version" + 1',
      updatedAt: () => 'CURRENT_TIMESTAMP',
    };
    if (dto.expiresAt) {
      set.expiresAt = dto.expiresAt;
    }

    const result = await this.assetRepository
      .createQueryBuilder()
      .update(Asset)
      .set(set)
      .where('id = :id AND version = :version', { id, version: dto.version })
      .execute();

    if (!result.affected) {
      const asset = await this.assetRepository.findOneBy({ id });
      if (!asset) {
        throw new NotFoundException('Asset not found');
      }
      throw new ConflictException(
        'Asset was modified by another request. Reload and retry.',
      );
    }

    return this.findByIdOrFail(id);
  }

  // ----- helpers -----

  private toListItem(asset: Asset): AssetListItem {
    return {
      id: asset.id,
      code: asset.code,
      status: asset.status,
      claimedBy: asset.claimedBy,
      claimedAt: asset.claimedAt,
      expiresAt: asset.expiresAt,
      version: asset.version,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  private toClaimedAsset(raw: UpdateRow): ClaimedAsset {
    return {
      id: raw.id,
      code: raw.code,
      status: raw.status,
      claimedAt: raw.claimed_at as Date,
      version: raw.version,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === '23505'
    );
  }
}
