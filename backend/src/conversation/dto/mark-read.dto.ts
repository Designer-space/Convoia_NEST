import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class MarkReadDto {
  /** Highest conversation seq the client has seen. Omitted => read to head. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lastReadSeq?: number;
}
