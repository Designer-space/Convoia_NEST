import { IsEnum, IsArray, IsNumber, IsOptional, IsString, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export enum ConversationType {
  DM = 'DM',
  GROUP = 'GROUP',
}

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  participantIds: number[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
