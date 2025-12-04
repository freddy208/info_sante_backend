// src/location/entities/geocode-result.entity.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 🌍 GEOCODE RESULT ENTITY
 *
 * Résultat d'une recherche de géocodage.
 */
export class GeocodeResultEntity {
  @ApiProperty({
    description: 'Adresse formatée complète',
    example: 'Rue de la République, Douala, Cameroun',
  })
  formattedAddress: string;

  @ApiProperty({
    description: 'Latitude',
    example: 4.0511,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude',
    example: 9.7679,
  })
  longitude: number;

  @ApiPropertyOptional({
    description: 'Ville',
    example: 'Douala',
  })
  city?: string;

  @ApiPropertyOptional({
    description: 'Région',
    example: 'Littoral',
  })
  region?: string;

  @ApiPropertyOptional({
    description: 'Pays',
    example: 'Cameroun',
  })
  country?: string;

  @ApiPropertyOptional({
    description: 'Code pays ISO',
    example: 'CM',
  })
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Code postal',
    example: '4032',
  })
  postcode?: string;

  @ApiProperty({
    description: 'Niveau de confiance (0-10)',
    example: 9,
  })
  confidence: number;

  @ApiPropertyOptional({
    description: 'ID OpenCage (pour référence)',
  })
  placeId?: string;

  constructor(partial: Partial<GeocodeResultEntity>) {
    Object.assign(this, partial);
  }
}
