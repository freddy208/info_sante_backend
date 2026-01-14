// dto/create-user-preference.dto.ts
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ArrayMaxSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserPreferenceDto {
  @ApiPropertyOptional({ example: ['uuid-category-1', 'uuid-category-2'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional({ example: ['uuid-org-1'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  organizations?: string[];

  @ApiPropertyOptional({ example: ['Douala', 'Yaoundé'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  cities?: string[];

  @ApiPropertyOptional({ example: ['Littoral', 'Centre'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  regions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ example: 'FR' })
  @IsString()
  @IsOptional()
  language?: string;
}
