import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AssetStatus } from '../asset-status.enum';

export class ListAssetsQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}
