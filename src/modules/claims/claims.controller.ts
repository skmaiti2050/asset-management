import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PaginatedAssetsDto } from '../assets/dto/paginated-assets.dto';
import { ClaimsService } from './claims.service';
import { ListHistoryQueryDto } from './dto/list-history.query.dto';
import { PaginatedHistoryDto } from './dto/paginated-history.dto';

@ApiTags('claims')
@ApiBearerAuth()
@Controller('me')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get('history')
  @ApiOperation({
    summary: 'List my claim history',
    description: 'Paginated claim/release history for the current user.',
  })
  @ApiOkResponse({
    description: 'Paginated history',
    type: PaginatedHistoryDto,
  })
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHistoryQueryDto,
  ) {
    return this.claimsService.getHistory(
      user.id,
      query.action,
      query.skip,
      query.limit,
    );
  }

  @Get('assets')
  @ApiOperation({ summary: 'List assets currently claimed by me' })
  @ApiOkResponse({
    description: 'Paginated list of currently claimed assets',
    type: PaginatedAssetsDto,
  })
  getCurrentAssets(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHistoryQueryDto,
  ) {
    return this.claimsService.getCurrentAssets(
      user.id,
      query.skip,
      query.limit,
    );
  }
}
