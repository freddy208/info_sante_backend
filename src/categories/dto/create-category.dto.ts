// src/categories/dto/create-category.dto.ts

import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsHexColor,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 📝 CREATE CATEGORY DTO
 *
 * Validation pour la création d'une catégorie.
 */
export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nom de la catégorie',
    example: 'Vaccination',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  name: string;

  @ApiPropertyOptional({
    description: 'Description de la catégorie',
    example: 'Toutes les campagnes de vaccination pour enfants et adultes',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Icône (emoji ou nom d'icône)",
    example: '💉',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Couleur hexadécimale',
    example: '#4CAF50',
  })
  @IsHexColor({
    message: 'La couleur doit être au format hexadécimal (ex: #4CAF50)',
  })
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    description: 'ID de la catégorie parente (pour créer une sous-catégorie)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: "L'ID parent doit être un UUID valide" })
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: "Ordre d'affichage",
    example: 1,
    minimum: 0,
  })
  @IsInt({ message: "L'ordre doit être un nombre entier" })
  @Min(0, { message: "L'ordre doit être supérieur ou égal à 0" })
  @IsOptional()
  order?: number;
}
