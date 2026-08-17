import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Claim } from '../claims/entities/claim.entity';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Claim])],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
