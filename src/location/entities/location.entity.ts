// src/location/entities/location.entity.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

/**
 * 📍 LOCATION ENTITY
 *
 * Représentation d'une localisation stockée en base de données.
 */
export class LocationEntity {
  @ApiProperty({
    description: 'ID unique de la localisation',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Type de contenu',
    enum: ContentType,
    example: ContentType.ANNOUNCEMENT,
  })
  contentType: ContentType;

  @ApiProperty({
    description: 'ID du contenu lié',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  contentId: string;

  @ApiProperty({
    description: 'Adresse',
    example: 'Rue de la République',
  })
  address: string;

  @ApiProperty({
    description: 'Ville',
    example: 'Douala',
  })
  city: string;

  @ApiProperty({
    description: 'Région',
    example: 'Littoral',
  })
  region: string;

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
    description: 'Place ID (référence externe)',
  })
  placeId: string | null;

  @ApiPropertyOptional({
    description: 'Adresse formatée complète',
    example: 'Rue de la République, Douala, Littoral, Cameroun',
  })
  formattedAddress: string | null;

  @ApiPropertyOptional({
    description: 'Informations additionnelles',
    example: 'À côté de la pharmacie',
  })
  additionalInfo: string | null;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-11-27T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2025-11-27T12:00:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<LocationEntity>) {
    Object.assign(this, partial);
  }
}
