import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssetsDto {
  @ApiProperty({
    description:
      'Asset codes to create (3-64 chars: uppercase letters, digits, _ or -)',
    example: ['ASSET-0001', 'ASSET-0002'],
    type: [String],
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @Matches(/^[A-Z0-9][A-Z0-9_-]{2,63}$/, {
    each: true,
    message: 'each code must be 3-64 chars: uppercase letters, digits, _ or -',
  })
  codes!: string[];
}
