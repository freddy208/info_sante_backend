import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

/**
 * 🔖 BOOKMARK ENTITY
 *
 * Représentation d'un favori pour l'API.
 */
export class BookmarkEntity {
  @ApiProperty({ description: 'ID unique' })
  id: string;

  @ApiProperty({ description: "ID de l'utilisateur" })
  userId: string;

  @ApiProperty({ description: 'Type de contenu', enum: ContentType })
  contentType: ContentType;

  @ApiProperty({ description: 'ID du contenu' })
  contentId: string;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  // Inclusions optionnelles
  @ApiPropertyOptional({
    description: 'Détails du contenu (annonce ou article)',
  })
  content?: any;

  constructor(partial: Partial<BookmarkEntity>) {
    Object.assign(this, partial);
  }
}
