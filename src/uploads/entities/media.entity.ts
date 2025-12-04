// src/uploads/entities/media.entity.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType, MediaStatus } from '@prisma/client';

/**
 * 📁 MEDIA ENTITY
 *
 * Représentation d'un fichier uploadé (image, document, etc.)
 */
export class MediaEntity {
  @ApiProperty({
    description: 'ID unique du média',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: "ID de l'organisation qui a uploadé",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  uploadedBy: string;

  @ApiProperty({
    description: 'Type de contenu',
    enum: ContentType,
    example: ContentType.PROFILE,
  })
  contentType: ContentType;

  @ApiPropertyOptional({
    description: 'ID du contenu lié (optionnel)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  contentId: string | null;

  @ApiProperty({
    description: 'Nom du fichier',
    example: 'avatar_abc123.jpg',
  })
  fileName: string;

  @ApiProperty({
    description: 'Nom original du fichier',
    example: 'mon-avatar.jpg',
  })
  originalFileName: string;

  @ApiProperty({
    description: 'Type MIME',
    example: 'image/jpeg',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Taille du fichier en bytes',
    example: 245678,
  })
  fileSize: number;

  @ApiProperty({
    description: 'URL publique du fichier',
    example:
      'https://res.cloudinary.com/duqsblvzm/image/upload/v1234567890/...',
  })
  url: string;

  @ApiPropertyOptional({
    description: 'URL de la miniature (images seulement)',
    example:
      'https://res.cloudinary.com/duqsblvzm/image/upload/c_thumb,w_200,h_200/...',
  })
  thumbnailUrl: string | null;

  @ApiPropertyOptional({
    description: 'Largeur (images seulement)',
    example: 1920,
  })
  width: number | null;

  @ApiPropertyOptional({
    description: 'Hauteur (images seulement)',
    example: 1080,
  })
  height: number | null;

  @ApiProperty({
    description: 'Public ID Cloudinary',
    example: 'fichier_infos_sante_app_prod/user_avatars/abc123',
  })
  cloudinaryPublicId: string;

  @ApiProperty({
    description: 'Statut du média',
    enum: MediaStatus,
    example: MediaStatus.ACTIVE,
  })
  status: MediaStatus;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-11-24T12:00:00.000Z',
  })
  createdAt: Date;

  constructor(partial: Partial<MediaEntity>) {
    Object.assign(this, partial);
  }
}
