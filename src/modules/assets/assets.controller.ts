import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UserRole } from '../users/user-role.enum';
import { AssetsService } from './assets.service';
import { CreateAssetsDto } from './dto/create-assets.dto';
import { ListAssetsQueryDto } from './dto/list-assets.query.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import {
  AssetListItem,
  ClaimedAsset,
  PoolState,
} from './interfaces/assets.interface';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('pool')
  getPoolState(): Promise<PoolState> {
    return this.assetsService.getPoolState();
  }

  @Get()
  list(@Query() query: ListAssetsQueryDto) {
    return this.assetsService.list(query.status, query.skip, query.limit);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<AssetListItem> {
    return this.assetsService.findByIdOrFail(id);
  }

  @Post(':id/claim')
  claim(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClaimedAsset> {
    return this.assetsService.claim(user.id, id);
  }

  @Post('claim-any')
  claimAny(@CurrentUser() user: AuthenticatedUser): Promise<ClaimedAsset> {
    return this.assetsService.claimAny(user.id);
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClaimedAsset> {
    return this.assetsService.release(user.id, id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  createMany(@Body() dto: CreateAssetsDto): Promise<{ created: number }> {
    return this.assetsService.createMany(dto.codes);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetListItem> {
    return this.assetsService.update(id, dto);
  }
}
