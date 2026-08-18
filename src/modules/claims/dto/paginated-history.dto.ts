import { ApiProperty } from '@nestjs/swagger';
import { HistoryItem } from './history-item.dto';

export class PaginatedHistoryDto {
  @ApiProperty({
    description: 'Page of history entries',
    type: () => [HistoryItem],
  })
  items!: HistoryItem[];

  @ApiProperty({ description: 'Total number of matching entries', example: 12 })
  total!: number;
}
