import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ClaimsService } from './claims.service';
import { ListHistoryQueryDto } from './dto/list-history.query.dto';

@Controller('me')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get('history')
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
