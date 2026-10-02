import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  replyToMessageId?: string | null;
}
