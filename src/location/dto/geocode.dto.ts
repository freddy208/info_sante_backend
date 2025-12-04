// src/location/dto/geocode.dto.ts

import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 🌍 GEOCODE DTO
 *
 * Validation pour convertir une adresse en coordonnées GPS.
 */
export class GeocodeDto {
  @ApiProperty({
    description: 'Adresse à géocoder',
    example: 'Rue de la République, Douala, Cameroun',
    minLength: 3,
  })
  @IsString({ message: "L'adresse doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "L'adresse est requise" })
  @MinLength(3, { message: "L'adresse doit contenir au moins 3 caractères" })
  address: string;
}
