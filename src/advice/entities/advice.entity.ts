import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdviceStatus, Priority, TargetAudience } from '@prisma/client';

/**
 * 💡 ADVICE ENTITY
 *
 * Représentation d'un conseil de santé pour l'API.
 */
export class AdviceEntity {
  @ApiProperty({ description: 'ID unique' })
  id: string;

  @ApiProperty({ description: "ID de l'organisation" })
  organizationId: string;

  @ApiProperty({ description: 'ID de la catégorie' })
  categoryId: string;

  @ApiProperty({ description: 'Titre du conseil' })
  title: string;

  @ApiProperty({ description: 'Contenu du conseil' })
  content: string;

  @ApiPropertyOptional({ description: "URL de l'icône représentatif" })
  icon?: string | undefined;

  @ApiProperty({ description: 'Nombre de réactions' })
  reactionsCount: number;

  @ApiProperty({ description: 'Priorité du conseil', enum: Priority })
  priority: Priority;

  @ApiPropertyOptional({
    description: 'Audience cible du conseil',
    isArray: true,
    enum: TargetAudience,
  })
  targetAudience?: TargetAudience[];

  @ApiProperty({ description: 'Nombre de vues' })
  viewsCount: number;

  @ApiProperty({ description: 'Nombre de partages' })
  sharesCount: number;

  @ApiProperty({ description: 'Le conseil est actif ?' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Date de publication' })
  publishedAt?: Date | undefined;

  @ApiProperty({ description: 'Statut', enum: AdviceStatus })
  status: AdviceStatus;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt: Date;

  // Inclusions optionnelles
  @ApiPropertyOptional({ description: "Détails de l'organisation" })
  organization?: any;

  @ApiPropertyOptional({ description: 'Détails de la catégorie' })
  category?: any;

  constructor(partial: Partial<AdviceEntity>) {
    Object.assign(this, partial);
  }
}
