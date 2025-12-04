import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommentStatus, ContentType } from '@prisma/client';

/**
 * 💬 COMMENT ENTITY
 *
 * Représentation d'un commentaire pour l'API.
 */
export class CommentEntity {
  @ApiProperty({ description: 'ID unique' })
  id: string;

  @ApiProperty({ description: "ID de l'utilisateur" })
  userId: string;

  @ApiProperty({ description: 'Type de contenu commenté', enum: ContentType })
  contentType: ContentType;

  @ApiProperty({ description: 'ID du contenu commenté' })
  contentId: string;

  @ApiPropertyOptional({ description: 'ID du commentaire parent' })
  parentCommentId?: string | undefined;

  @ApiProperty({ description: 'Contenu du commentaire' })
  content: string;

  @ApiProperty({ description: 'Nombre de réactions' })
  reactionsCount: number;

  @ApiProperty({ description: 'Nombre de réponses' })
  repliesCount: number;

  @ApiProperty({ description: 'Le commentaire a été modifié ?' })
  isEdited: boolean;

  @ApiPropertyOptional({ description: 'Date de modification' })
  editedAt?: Date | undefined;

  @ApiProperty({ description: 'Statut du commentaire', enum: CommentStatus })
  status: CommentStatus;

  @ApiPropertyOptional({
    description: "ID de l'administrateur qui a masqué le commentaire",
  })
  hiddenBy?: string | undefined;

  @ApiPropertyOptional({ description: 'Raison du masquage' })
  hiddenReason?: string | undefined;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt: Date;

  // Inclusions optionnelles
  @ApiPropertyOptional({ description: "Détails de l'utilisateur" })
  user?: any;

  @ApiPropertyOptional({ description: 'Réponses au commentaire' })
  replies?: CommentEntity[];

  constructor(partial: Partial<CommentEntity>) {
    Object.assign(this, partial);
  }
}
