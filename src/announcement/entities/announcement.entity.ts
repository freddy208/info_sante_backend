import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementStatus, TargetAudience } from '@prisma/client';

/**
 * 📢 ANNOUNCEMENT ENTITY
 *
 * Représentation d'une annonce pour l'API.
 */
export class AnnouncementEntity {
  @ApiProperty({ description: 'ID unique' })
  id: string;

  @ApiProperty({ description: "ID de l'organisation" })
  organizationId: string;

  @ApiProperty({ description: 'Titre' })
  title: string;

  @ApiPropertyOptional({ description: "Slug unique pour l'URL" })
  slug: string | null | undefined; // Corrigé pour accepter null

  @ApiProperty({ description: 'Contenu' })
  content: string;

  @ApiPropertyOptional({ description: 'Résumé' })
  excerpt?: string | null; // Corrigé pour accepter null

  @ApiProperty({ description: "URL de l'image principale" })
  featuredImage: string;

  @ApiPropertyOptional({ description: 'URL de la miniature' })
  thumbnailImage?: string | null; // Corrigé pour accepter null

  @ApiProperty({ description: 'ID de la catégorie' })
  categoryId: string;

  @ApiProperty({ description: 'Date de début' })
  startDate: Date;

  @ApiProperty({ description: 'Date de fin' })
  endDate: Date;

  @ApiPropertyOptional({
    description: 'Public cible',
    enum: TargetAudience,
    isArray: true,
  })
  targetAudience?: TargetAudience[];

  @ApiProperty({ description: 'Est gratuit ?' })
  isFree: boolean;

  @ApiPropertyOptional({ description: 'Coût' })
  cost?: number | null; // Corrigé pour accepter null

  @ApiPropertyOptional({ description: 'Capacité' })
  capacity?: number | null; // Corrigé pour accepter null

  @ApiProperty({ description: "Nombre d'inscrits" })
  registeredCount: number;

  @ApiProperty({ description: 'Inscription requise ?' })
  requiresRegistration: boolean;

  @ApiProperty({ description: 'Nombre de vues' })
  viewsCount: number;

  @ApiProperty({ description: 'Nombre de partages' })
  sharesCount: number;

  @ApiProperty({ description: 'Nombre de commentaires' })
  commentsCount: number;

  @ApiProperty({ description: 'Nombre de réactions' })
  reactionsCount: number;

  @ApiProperty({ description: 'Est épinglé ?' })
  isPinned: boolean;

  @ApiPropertyOptional({ description: 'Date de publication' })
  publishedAt?: Date | null; // Corrigé pour accepter null

  @ApiProperty({ description: 'Statut', enum: AnnouncementStatus })
  status: AnnouncementStatus;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt: Date;

  // Inclusions optionnelles
  @ApiPropertyOptional({ description: "Détails de l'organisation" })
  organization?: any;

  @ApiPropertyOptional({ description: 'Détails de la catégorie' })
  category?: any;

  @ApiPropertyOptional({ description: "Localisation de l'événement" })
  location?: any;

  constructor(partial: Partial<AnnouncementEntity>) {
    Object.assign(this, partial);
  }
}
