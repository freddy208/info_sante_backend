/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';

// ==========================================
// 🏢 SOUS-ENTITÉ POUR L'ORGANISATION
// ==========================================
export class ArticleOrganization {
  @ApiProperty({ description: "ID de l'organisation" })
  id: string;

  @ApiProperty({ description: 'Nom de la structure' })
  name: string;

  @ApiProperty({ description: 'Logo', required: false, nullable: true })
  logo: string | null;

  @ApiProperty({ description: 'Organisation vérifiée (Confiance)' })
  isVerified: boolean;
}

// ==========================================
// 📂 SOUS-ENTITÉ POUR LA CATÉGORIE
// ==========================================
export class ArticleCategory {
  @ApiProperty({ description: 'ID de la catégorie' })
  id: string;

  @ApiProperty({ description: 'Nom de la catégorie' })
  name: string;

  @ApiProperty({
    description: 'Slug de la catégorie',
    required: false,
    nullable: true,
  })
  slug: string | null;
}

// ==========================================
// 📰 ENTITÉ PRINCIPALE
// ==========================================
export class ArticleEntity {
  @ApiProperty({ description: 'ID unique' })
  id: string;

  @ApiProperty({ description: "ID de l'organisation" })
  organizationId: string;

  @ApiProperty({ description: 'Titre' })
  title: string;

  @ApiPropertyOptional({ description: "Slug unique pour l'URL" })
  slug?: string | undefined;

  @ApiPropertyOptional({ description: 'Contenu (seulement dans les détails)' })
  content?: string | undefined;

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
    description: 'Tags',
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

  @ApiPropertyOptional({
    description: "Détails de l'organisation",
    type: ArticleOrganization,
  })
  organization?: ArticleOrganization;

  @ApiPropertyOptional({
    description: 'Détails de la catégorie',
    type: ArticleCategory,
  })
  category?: ArticleCategory;

  // ==========================================
  // ✅ CONSTRUCTEUR FINALE
  // ==========================================
  // On accepte 'any' car c'est un appel interne du Service.
  // Le constructeur garantit que l'objet final 'this' est propre.
  constructor(partial: any) {
    const sanitized = Object.entries(partial).reduce((acc, [key, value]) => {
      // Ici on transforme null -> undefined pour respecter les types de l'API
      if (value === null) {
        acc[key] = undefined;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Partial<ArticleEntity>);

    Object.assign(this, sanitized);
  }
}
