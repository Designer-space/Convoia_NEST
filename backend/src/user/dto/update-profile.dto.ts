import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProfilePrivacyDto {
  @IsOptional()
  @IsBoolean()
  showEmailToFriends?: boolean;

  @IsOptional()
  @IsBoolean()
  showPhoneToFriends?: boolean;
}

export class UpdateProfileDto {
  /** Any language: accents, apostrophes and non-Latin scripts are allowed. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(150)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsObject()
  privacy?: ProfilePrivacyDto;
}
