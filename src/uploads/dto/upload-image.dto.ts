// src/uploads/dto/upload-image.dto.ts

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

/**
 * 🖼️ UPLOAD IMAGE DTO
 *
 * Validation pour l'upload d'images.
 *
 * TYPES D'IMAGES ACCEPTÉS :
 * - PROFILE : Avatar utilisateur/organisation
 * - COVER : Image de couverture
 * - ANNOUNCEMENT : Image d'annonce
 * - ARTICLE : Image d'article
 * - ORGANIZATION : Logo/images organisation
 */
export class UploadImageDto {
  @ApiProperty({
    description: "Type de contenu pour l'image",
    enum: ContentType,
    example: ContentType.PROFILE,
    examples: {
      profile: {
        value: ContentType.PROFILE,
        description: 'Avatar utilisateur ou organisation',
      },
      cover: {
        value: ContentType.COVER,
        description: 'Image de couverture',
      },
      announcement: {
        value: ContentType.ANNOUNCEMENT,
        description: 'Image pour une annonce',
      },
      article: {
        value: ContentType.ARTICLE,
        description: 'Image pour un article',
      },
      organization: {
        value: ContentType.ORGANIZATION,
        description: "Logo ou image d'organisation",
      },
    },
  })
  @IsEnum(ContentType, { message: 'Type de contenu invalide' })
  contentType: ContentType;

  @ApiPropertyOptional({
    description: 'ID du contenu lié (optionnel)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  contentId?: string;
}
