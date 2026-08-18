import { ApiProperty } from '@nestjs/swagger';

export class CreatedAssetsResultDto {
  @ApiProperty({ description: 'Number of assets created', example: 2 })
  created!: number;
}
