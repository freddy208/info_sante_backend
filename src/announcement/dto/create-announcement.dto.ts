import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsBoolean,
  IsDecimal,
  IsInt,
  Min,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TargetAudience } from '@prisma/client';

/**
 * 📢 CREATE ANNOUNCEMENT DTO
 *
 * Validation pour créer une nouvelle annonce.
 */
export class CreateAnnouncementDto {
  @ApiProperty({
    description: "Titre de l'annonce",
    example: 'Campagne de Vaccination contre la Poliomyélite',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 200)
  title: string;

  @ApiProperty({
    description: "Contenu de l'annonce",
    example: 'Le ministère de la Santé organise une campagne...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: "Résumé de l'annonce",
    example: 'Vaccination gratuite pour les enfants de 0 à 5 ans.',
  })
  @IsString()
  @IsOptional()
  @Length(10, 500)
  excerpt?: string;

  @ApiProperty({
    description: "URL de l'image principale",
    example: 'https://res.cloudinary.com/.../vaccination.jpg',
  })
  @IsString()
  @IsNotEmpty()
  featuredImage: string;

  @ApiPropertyOptional({
    description: 'URL de la miniature',
    example: 'https://res.cloudinary.com/.../vaccination_thumb.jpg',
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

  @ApiProperty({
    description: "Date de début de l'événement",
    example: '2024-12-10T08:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: "Date de fin de l'événement",
    example: '2024-12-15T17:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Public cible',
    enum: TargetAudience,
    isArray: true,
    example: [TargetAudience.CHILDREN, TargetAudience.INFANTS],
  })
  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  @IsOptional()
  targetAudience?: TargetAudience[];

  @ApiPropertyOptional({
    description: "L'événement est-il gratuit ?",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiPropertyOptional({
    description: 'Coût de participation',
    example: '5000',
  })
  @Type(() => Number)
  @IsDecimal()
  @IsOptional()
  cost?: number;

  @ApiPropertyOptional({
    description: 'Nombre de places disponibles',
    example: 100,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    description: "L'inscription est-elle requise ?",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  requiresRegistration?: boolean;
}
