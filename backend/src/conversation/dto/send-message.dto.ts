import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  replyToMessageId?: string | null;

  /** Client-generated idempotency key so retries don't duplicate messages. */
  @IsOptional()
  @IsUUID()
  clientMsgId?: string;
}
