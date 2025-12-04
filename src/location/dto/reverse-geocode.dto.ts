// src/location/dto/reverse-geocode.dto.ts

import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 🔄 REVERSE GEOCODE DTO
 *
 * Validation pour convertir des coordonnées GPS en adresse.
 */
export class ReverseGeocodeDto {
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
}
