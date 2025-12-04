import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';

/**
 * 📰 ARTICLE ENTITY
 *
 * Représentation d'un article pour l'API.
 */
export class ArticleEntity {
  @ApiProperty({ description: 'ID unique' })
  id: string;

  @ApiProperty({ description: "ID de l'organisation" })
  organizationId: string;

  @ApiProperty({ description: 'Titre' })
  title: string;

  @ApiPropertyOptional({ description: "Slug unique pour l'URL" })
  slug?: string | undefined;

  @ApiProperty({ description: 'Contenu' })
  content: string;

  @ApiPropertyOptional({ description: 'Résumé' })
  excerpt?: string | undefined;

  @ApiProperty({ description: "URL de l'image principale" })
  featuredImage: string;

  @ApiPropertyOptional({ description: 'URL de la miniature' })
  thumbnailImage?: string | undefined;

  @ApiProperty({ description: 'ID de la catégorie' })
  categoryId: string;

  @ApiPropertyOptional({ description: "Nom de l'auteur" })
  author?: string | undefined;

  @ApiPropertyOptional({ description: 'Temps de lecture estimé (en minutes)' })
  readingTime?: number | undefined;

  @ApiPropertyOptional({
    description: 'Tags pour la recherche et classification',
    isArray: true,
  })
  tags?: string[];

  @ApiProperty({ description: 'Nombre de vues' })
  viewsCount: number;

  @ApiProperty({ description: 'Nombre de partages' })
  sharesCount: number;

  @ApiProperty({ description: 'Nombre de commentaires' })
  commentsCount: number;

  @ApiProperty({ description: 'Nombre de réactions' })
  reactionsCount: number;

  @ApiProperty({ description: 'Est mis en avant ?' })
  isFeatured: boolean;

  @ApiPropertyOptional({ description: 'Date de publication' })
  publishedAt?: Date | undefined;

  @ApiProperty({ description: 'Statut', enum: ArticleStatus })
  status: ArticleStatus;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt: Date;

  // Inclusions optionnelles
  @ApiPropertyOptional({ description: "Détails de l'organisation" })
  organization?: any;

  @ApiPropertyOptional({ description: 'Détails de la catégorie' })
  category?: any;

  constructor(partial: Partial<ArticleEntity>) {
    Object.assign(this, partial);
  }
}
