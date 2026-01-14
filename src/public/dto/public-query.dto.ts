/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsArray,
  IsEnum,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrganizationType {
  HOSPITAL_PUBLIC = 'HOSPITAL_PUBLIC',
  CLINIC = 'CLINIC',
  PHARMACY = 'PHARMACY',
  LABORATORY = 'LABORATORY',
}

export class NearbyQueryDto {
  @ApiProperty({ description: 'Latitude utilisateur', example: 3.848 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat!: number;

  @ApiProperty({ description: 'Longitude utilisateur', example: 11.5021 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  lng!: number;

  @ApiPropertyOptional({
    description: 'Rayon de recherche en km',
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value) || 20)
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  radius: number = 20;

  @ApiPropertyOptional({
    description: 'Limite stricte de résultats',
    default: 50,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const limit = Number(value);
    if (!limit || limit < 5) return 5;
    if (limit > 50) return 50;
    return limit;
  })
  @IsNumber()
  limit: number = 50;

  @ApiPropertyOptional({
    description: 'Filtrer par type',
    enum: OrganizationType,
    isArray: true,
    example: ['HOSPITAL_PUBLIC', 'CLINIC'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(OrganizationType, { each: true })
  types?: OrganizationType[];
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'Terme de recherche (min 3 caractères)',
    example: 'Paludisme',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(3)
  q!: string;

  @ApiPropertyOptional({ description: 'Limite de résultats', default: 10 })
  @IsOptional()
  @Transform(({ value }) => {
    const limit = Number(value);
    if (!limit || limit < 1) return 10;
    if (limit > 50) return 50;
    return limit;
  })
  @IsNumber()
  limit: number = 10;
}
