import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UserRole } from '../users/user-role.enum';
import { AssetsService } from './assets.service';
import { AssetListItem } from './dto/asset-list-item.dto';
import { ClaimedAsset } from './dto/claimed-asset.dto';
import { CreateAssetsDto } from './dto/create-assets.dto';
import { CreatedAssetsResultDto } from './dto/created-assets-result.dto';
import { ListAssetsQueryDto } from './dto/list-assets.query.dto';
import { PaginatedAssetsDto } from './dto/paginated-assets.dto';
import { PoolState } from './dto/pool-state.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('pool')
  @ApiOperation({
    summary: 'Get asset pool state',
    description: 'Counts assets by status across the whole pool.',
  })
  @ApiOkResponse({ description: 'Pool statistics', type: PoolState })
  getPoolState(): Promise<PoolState> {
    return this.assetsService.getPoolState();
  }

  @Get()
  @ApiOperation({
    summary: 'List assets',
    description: 'Paginated asset list, optionally filtered by status.',
  })
  @ApiOkResponse({
    description: 'Paginated asset list',
    type: PaginatedAssetsDto,
  })
  list(@Query() query: ListAssetsQueryDto) {
    return this.assetsService.list(query.status, query.skip, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by id' })
  @ApiOkResponse({
    description: 'The requested asset',
    type: AssetListItem,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  getById(@Param('id') id: string): Promise<AssetListItem> {
    return this.assetsService.findByIdOrFail(id);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: 'Claim a specific asset' })
  @ApiOkResponse({
    description: 'The claimed asset',
    type: ClaimedAsset,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({
    status: 409,
    description: 'Asset already claimed or conflict',
  })
  @ApiResponse({
    status: 403,
    description: 'User already holds a claimed asset',
  })
  claim(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClaimedAsset> {
    return this.assetsService.claim(user.id, id);
  }

  @Post('claim-any')
  @ApiOperation({ summary: 'Claim any available asset' })
  @ApiOkResponse({
    description: 'The claimed asset',
    type: ClaimedAsset,
  })
  @ApiResponse({ status: 409, description: 'No assets available or conflict' })
  @ApiResponse({
    status: 403,
    description: 'User already holds a claimed asset',
  })
  claimAny(@CurrentUser() user: AuthenticatedUser): Promise<ClaimedAsset> {
    return this.assetsService.claimAny(user.id);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release a claimed asset' })
  @ApiOkResponse({
    description: 'The claimed asset',
    type: ClaimedAsset,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 403, description: 'Asset not claimed by this user' })
  @ApiResponse({ status: 409, description: 'Conflict on version or state' })
  release(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClaimedAsset> {
    return this.assetsService.release(user.id, id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Create assets in bulk',
    description: 'Admin only. Creates up to 1000 assets at once.',
  })
  @ApiOkResponse({
    description: 'Number of assets created',
    type: CreatedAssetsResultDto,
  })
  @ApiResponse({ status: 403, description: 'Requires admin role' })
  createMany(@Body() dto: CreateAssetsDto): Promise<{ created: number }> {
    return this.assetsService.createMany(dto.codes);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update asset',
    description: 'Admin only. Uses optimistic concurrency via version.',
  })
  @ApiOkResponse({
    description: 'The updated asset',
    type: AssetListItem,
  })
  @ApiResponse({ status: 403, description: 'Requires admin role' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({
    status: 409,
    description: 'Version mismatch (optimistic lock)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetListItem> {
    return this.assetsService.update(id, dto);
  }
}
