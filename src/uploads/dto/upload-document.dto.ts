// src/uploads/dto/upload-document.dto.ts

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

/**
 * 📄 UPLOAD DOCUMENT DTO
 *
 * Validation pour l'upload de documents (PDF, Word, etc.)
 *
 * TYPES DE DOCUMENTS :
 * - ORGANIZATION : Documents d'agrément, licences
 * - ARTICLE : Documents joints aux articles
 * - ANNOUNCEMENT : Documents joints aux annonces
 */
export class UploadDocumentDto {
  @ApiProperty({
    description: 'Type de contenu pour le document',
    enum: ContentType,
    example: ContentType.ORGANIZATION,
    examples: {
      organization: {
        value: ContentType.ORGANIZATION,
        description: "Document d'agrément, licence",
      },
      article: {
        value: ContentType.ARTICLE,
        description: 'Document joint à un article',
      },
      announcement: {
        value: ContentType.ANNOUNCEMENT,
        description: 'Document joint à une annonce',
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
