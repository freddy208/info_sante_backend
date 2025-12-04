// src/location/dto/create-location.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';
import { Type } from 'class-transformer';

/**
 * 📍 CREATE LOCATION DTO
 *
 * Validation pour créer une localisation en base de données.
 */
export class CreateLocationDto {
  @ApiProperty({
    description: 'Type de contenu',
    enum: ContentType,
    example: ContentType.ANNOUNCEMENT,
  })
  @IsEnum(ContentType, { message: 'Type de contenu invalide' })
  contentType: ContentType;

  @ApiProperty({
    description: 'ID du contenu lié',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: "L'ID du contenu est requis" })
  contentId: string;

  @ApiProperty({
    description: 'Adresse',
    example: 'Rue de la République',
  })
  @IsString({ message: "L'adresse doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "L'adresse est requise" })
  address: string;

  @ApiProperty({
    description: 'Ville',
    example: 'Douala',
  })
  @IsString({ message: 'La ville doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La ville est requise' })
  city: string;

  @ApiProperty({
    description: 'Région',
    example: 'Littoral',
  })
  @IsString({ message: 'La région doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La région est requise' })
  region: string;

  @ApiProperty({
    description: 'Latitude',
    example: 4.0511,
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'La latitude doit être un nombre' })
  @Min(-90, { message: 'La latitude doit être >= -90' })
  @Max(90, { message: 'La latitude doit être <= 90' })
  latitude: number;

  @ApiProperty({
    description: 'Longitude',
    example: 9.7679,
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'La longitude doit être un nombre' })
  @Min(-180, { message: 'La longitude doit être >= -180' })
  @Max(180, { message: 'La longitude doit être <= 180' })
  longitude: number;

  @ApiPropertyOptional({
    description: 'Place ID (référence externe)',
  })
  @IsString()
  @IsOptional()
  placeId?: string;

  @ApiPropertyOptional({
    description: 'Adresse formatée complète',
    example: 'Rue de la République, Douala, Littoral, Cameroun',
  })
  @IsString()
  @IsOptional()
  formattedAddress?: string;

  @ApiPropertyOptional({
    description: 'Informations additionnelles',
    example: 'À côté de la pharmacie',
  })
  @IsString()
  @IsOptional()
  additionalInfo?: string;
}
