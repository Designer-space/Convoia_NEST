import { IsArray, IsOptional, IsString, ArrayMaxSize } from 'class-validator';

export class MarkReadDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  messageIds?: string[];
}
