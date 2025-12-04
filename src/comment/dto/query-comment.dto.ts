import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ContentType, CommentStatus } from '@prisma/client';

/**
 * 🔍 QUERY COMMENT DTO
 *
 * Validation pour les paramètres de requête (listes).
 */
export class QueryCommentDto {
  @ApiPropertyOptional({
    description: 'Numéro de page',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    example: 20,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filtrer par type de contenu',
    enum: ContentType,
  })
  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @ApiPropertyOptional({
    description: 'Filtrer par ID du contenu',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut (pour les listes privées)',
    enum: CommentStatus,
  })
  @IsEnum(CommentStatus)
  @IsOptional()
  status?: CommentStatus;

  @ApiPropertyOptional({
    description: 'Recherche dans le contenu des commentaires',
    example: 'informatif',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'ID du commentaire parent (pour récupérer les réponses)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  parentCommentId?: string;
}
