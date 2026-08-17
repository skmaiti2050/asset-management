import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
  Matches,
} from 'class-validator';

export class CreateAssetsDto {
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
