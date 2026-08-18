import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AssetStatus } from '../asset-status.enum';

export class ListAssetsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: AssetStatus,
    description: 'Filter assets by status',
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}
