import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

/**
 * 💬 CREATE COMMENT DTO
 *
 * Validation pour créer un nouveau commentaire.
 */
export class CreateCommentDto {
  @ApiProperty({
    description: 'Type de contenu commenté',
    enum: ContentType,
    example: ContentType.ARTICLE,
  })
  @IsEnum(ContentType, { message: 'Type de contenu invalide' })
  @IsNotEmpty({ message: 'Le type de contenu est requis' })
  contentType: ContentType;

  @ApiProperty({
    description: 'ID du contenu commenté',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: "L'ID du contenu est requis" })
  contentId: string;

  @ApiPropertyOptional({
    description: 'ID du commentaire parent (pour une réponse)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  parentCommentId?: string;

  @ApiProperty({
    description: 'Contenu du commentaire',
    example: 'Cet article est très informatif, merci pour le partage !',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le contenu du commentaire est requis' })
  @MaxLength(1000, {
    message: 'Le commentaire ne peut pas dépasser 1000 caractères',
  })
  content: string;
}
