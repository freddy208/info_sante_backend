// src/location/dto/update-location.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateLocationDto } from './create-location.dto';
import { OmitType } from '@nestjs/swagger';

/**
 * 📝 UPDATE LOCATION DTO
 *
 * Validation pour mettre à jour une localisation.
 * Tous les champs sont optionnels sauf contentType et contentId.
 */
export class UpdateLocationDto extends PartialType(
  OmitType(CreateLocationDto, ['contentType', 'contentId'] as const),
) {}
