// src/categories/dto/update-category.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 📝 UPDATE CATEGORY DTO
 *
 * Validation pour la mise à jour d'une catégorie.
 * Tous les champs sont optionnels (PATCH partiel).
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({
    description: 'Activer/Désactiver la catégorie',
    example: true,
  })
  @IsBoolean({ message: 'isActive doit être un booléen' })
  @IsOptional()
  isActive?: boolean;
}
