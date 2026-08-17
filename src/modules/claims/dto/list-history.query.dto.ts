import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ClaimAction } from '../claim-action.enum';

export class ListHistoryQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ClaimAction)
  action?: ClaimAction;
}
