// src/categories/entities/category.entity.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 📂 CATEGORY ENTITY
 *
 * Représentation d'une catégorie de santé pour les réponses API.
 */
export class CategoryEntity {
  @ApiProperty({
    description: 'ID unique de la catégorie',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nom de la catégorie',
    example: 'Vaccination',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Slug URL-friendly',
    example: 'vaccination',
  })
  slug: string | null;

  @ApiPropertyOptional({
    description: 'Description de la catégorie',
    example: 'Toutes les campagnes de vaccination',
  })
  description: string | null;

  @ApiPropertyOptional({
    description: "Icône (emoji ou nom d'icône)",
    example: '💉',
  })
  icon: string | null;

  @ApiPropertyOptional({
    description: 'Couleur hexadécimale',
    example: '#4CAF50',
  })
  color: string | null;

  @ApiPropertyOptional({
    description: 'ID de la catégorie parente (si sous-catégorie)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  parentId: string | null;

  @ApiProperty({
    description: "Ordre d'affichage",
    example: 1,
  })
  order: number;

  @ApiProperty({
    description: 'Catégorie active ?',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: "Nombre d'annonces dans cette catégorie",
    example: 15,
  })
  announcementsCount: number;

  @ApiProperty({
    description: "Nombre d'articles dans cette catégorie",
    example: 8,
  })
  articlesCount: number;

  @ApiProperty({
    description: 'Nombre de conseils dans cette catégorie',
    example: 3,
  })
  advicesCount: number;

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

  // ✅ Champs optionnels pour les relations
  @ApiPropertyOptional({
    description: 'Catégorie parente (si sous-catégorie)',
    type: () => CategoryEntity,
  })
  parent?: CategoryEntity;

  @ApiPropertyOptional({
    description: 'Sous-catégories',
    type: () => [CategoryEntity],
  })
  children?: CategoryEntity[];

  constructor(partial: Partial<CategoryEntity>) {
    Object.assign(this, partial);
  }
}
