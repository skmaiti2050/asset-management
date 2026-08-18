import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ClaimAction } from '../claim-action.enum';

export class ListHistoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ClaimAction,
    description: 'Filter history by action',
  })
  @IsOptional()
  @IsEnum(ClaimAction)
  action?: ClaimAction;
}
