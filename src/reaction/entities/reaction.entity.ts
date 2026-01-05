import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType, ReactionType } from '@prisma/client';

/**
 * ❤️ REACTION ENTITY
 *
 * Représentation d'une réaction pour l'API.
 */
export class ReactionEntity {
  @ApiProperty({ description: 'ID unique' })
  id: string;

  @ApiProperty({ description: "ID de l'utilisateur" })
  userId: string;

  @ApiProperty({ description: 'Type de contenu', enum: ContentType })
  contentType: ContentType;

  @ApiProperty({ description: 'ID du contenu' })
  contentId: string;

  @ApiProperty({ description: 'Type de réaction', enum: ReactionType })
  type: ReactionType;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  // Inclusions optionnelles
  @ApiPropertyOptional({ description: "Détails de l'utilisateur" })
  user?: any;

  constructor(partial: Partial<ReactionEntity>) {
    Object.assign(this, partial);
  }
}
