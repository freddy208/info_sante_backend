import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  Length,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 📰 CREATE ARTICLE DTO
 *
 * Validation pour créer un nouvel article.
 */
export class CreateArticleDto {
  @ApiProperty({
    description: "Titre de l'article",
    example: "Les bienfaits de l'activité physique sur la santé mentale",
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 200)
  title: string;

  @ApiProperty({
    description: "Contenu de l'article",
    example:
      "L'activité physique régulière est essentielle pour maintenir une bonne santé mentale...",
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: "Résumé de l'article",
    example:
      "Découvrez comment l'exercice peut améliorer votre humeur et réduire le stress.",
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(10, 500)
  excerpt?: string;

  @ApiProperty({
    description: "URL de l'image principale",
    example: 'https://res.cloudinary.com/.../exercise-mental-health.jpg',
  })
  @IsString()
  @IsNotEmpty()
  featuredImage: string;

  @ApiPropertyOptional({
    description: 'URL de la miniature',
    example: 'https://res.cloudinary.com/.../exercise-mental-health_thumb.jpg',
  })
  @IsString()
  @IsOptional()
  thumbnailImage?: string;

  @ApiProperty({
    description: 'ID de la catégorie',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({
    description: "Nom de l'auteur",
    example: 'Dr. Jean Dupont',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  author?: string;

  @ApiPropertyOptional({
    description: 'Temps de lecture estimé (en minutes)',
    example: 5,
    minimum: 1,
    maximum: 60,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  readingTime?: number;

  @ApiPropertyOptional({
    description: 'Tags pour la recherche et classification',
    example: ['santé', 'exercice', 'bien-être', 'santé mentale'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: "URL externe de l'article",
    example: 'https://example.com/article-complet',
  })
  @IsUrl()
  @IsOptional()
  externalUrl?: string;
}
