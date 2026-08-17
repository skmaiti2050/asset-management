import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClaimAction } from '../claims/claim-action.enum';
import { Claim } from '../claims/entities/claim.entity';
import { AssetStatus } from './asset-status.enum';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';

describe('AssetsService', () => {
  let service: AssetsService;

  const builder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const assetRepo = {
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(builder),
  };

  const manager = {
    createQueryBuilder: jest.fn().mockReturnValue(builder),
    insert: jest.fn(),
    query: jest.fn(),
    getRepository: jest
      .fn()
      .mockReturnValue({ findOneBy: assetRepo.findOneBy }),
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  function claimedRawRow() {
    return [
      {
        id: 'a1',
        code: 'CODE-1',
        status: AssetStatus.CLAIMED,
        claimed_at: new Date('2026-01-01T00:00:00Z'),
        version: 2,
      },
    ];
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    dataSource.transaction.mockImplementation(
      (callback: (entityManager: unknown) => Promise<unknown>) =>
        callback(manager),
    );

    const module = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: getRepositoryToken(Asset), useValue: assetRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AssetsService);
  });

  describe('claim', () => {
    it('claims an available asset and records history in the same transaction', async () => {
      builder.execute.mockResolvedValue({ raw: claimedRawRow() });

      const result = await service.claim('u1', 'a1');

      expect(manager.insert).toHaveBeenCalledWith(Claim, {
        userId: 'u1',
        assetId: 'a1',
        action: ClaimAction.CLAIM,
      });
      expect(result).toMatchObject({
        id: 'a1',
        code: 'CODE-1',
        status: AssetStatus.CLAIMED,
        version: 2,
      });
    });

    it('rejects a second claim on an already claimed asset', async () => {
      builder.execute.mockResolvedValue({ raw: [] });
      assetRepo.findOneBy.mockResolvedValue({
        id: 'a1',
        status: AssetStatus.CLAIMED,
        expiresAt: null,
      });

      await expect(service.claim('u1', 'a1')).rejects.toThrow(
        ConflictException,
      );
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('rejects a claim on a missing asset with 404', async () => {
      builder.execute.mockResolvedValue({ raw: [] });
      assetRepo.findOneBy.mockResolvedValue(null);

      await expect(service.claim('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('claimAny', () => {
    it('claims the next locked asset and records history', async () => {
      manager.query.mockResolvedValue([{ id: 'a1' }]);
      builder.execute.mockResolvedValue({ raw: claimedRawRow() });

      const result = await service.claimAny('u1');

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('SKIP LOCKED'),
        [AssetStatus.AVAILABLE],
      );
      expect(result.code).toBe('CODE-1');
    });

    it('rejects when the pool is empty', async () => {
      manager.query.mockResolvedValue([]);

      await expect(service.claimAny('u1')).rejects.toThrow(ConflictException);
    });
  });

  describe('release', () => {
    it('releases a claimed asset back to available', async () => {
      builder.execute.mockResolvedValue({
        raw: [
          {
            id: 'a1',
            code: 'CODE-1',
            status: AssetStatus.AVAILABLE,
            claimed_at: null,
            version: 3,
          },
        ],
      });

      const result = await service.release('u1', 'a1');

      expect(manager.insert).toHaveBeenCalledWith(Claim, {
        userId: 'u1',
        assetId: 'a1',
        action: ClaimAction.RELEASE,
      });
      expect(result.status).toBe(AssetStatus.AVAILABLE);
    });

    it('forbids releasing an asset claimed by another user', async () => {
      builder.execute.mockResolvedValue({ raw: [] });
      assetRepo.findOneBy.mockResolvedValue({
        id: 'a1',
        status: AssetStatus.CLAIMED,
        claimedBy: 'u2',
        expiresAt: null,
      });

      await expect(service.release('u1', 'a1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createMany', () => {
    it('creates the given codes', async () => {
      dataSource.transaction.mockImplementation(
        async (callback: (entityManager: unknown) => Promise<unknown>) =>
          callback(manager),
      );
      manager.insert.mockResolvedValue(undefined);

      const result = await service.createMany(['A-1', 'A-2']);

      expect(result).toEqual({ created: 2 });
      expect(manager.insert).toHaveBeenCalledWith(Asset, [
        { code: 'A-1' },
        { code: 'A-2' },
      ]);
    });

    it('rejects duplicate codes with a conflict', async () => {
      dataSource.transaction.mockImplementation(() => {
        const error = new Error('duplicate key') as Error & { code: string };
        error.code = '23505';
        throw error;
      });

      await expect(service.createMany(['A-1'])).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('updates metadata when the version matches', async () => {
      builder.execute.mockResolvedValue({ affected: 1 });
      assetRepo.findOneBy.mockResolvedValue({
        id: 'a1',
        code: 'CODE-1',
        status: AssetStatus.AVAILABLE,
        claimedBy: null,
        claimedAt: null,
        expiresAt: new Date('2030-01-01T00:00:00Z'),
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update('a1', {
        version: 1,
        expiresAt: '2030-01-01T00:00:00Z',
      });

      expect(builder.where).toHaveBeenCalledWith(
        'id = :id AND version = :version',
        { id: 'a1', version: 1 },
      );
      expect(result.version).toBe(2);
    });

    it('rejects a stale version with a conflict', async () => {
      builder.execute.mockResolvedValue({ affected: 0 });
      assetRepo.findOneBy.mockResolvedValue({
        id: 'a1',
        status: AssetStatus.AVAILABLE,
      });

      await expect(service.update('a1', { version: 1 })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
