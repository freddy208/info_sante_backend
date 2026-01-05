import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Priority, AdviceStatus, TargetAudience } from '@prisma/client';

/**
 * 🔍 QUERY ADVICE DTO
 *
 * Validation pour les paramètres de requête (listes).
 */
export class QueryAdviceDto {
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
    description: 'Filtrer par catégorie',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par organisation',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Recherche par titre ou contenu',
    example: 'paludisme',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par ville',
    example: 'Douala',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut (pour les listes privées)',
    enum: AdviceStatus,
  })
  @IsEnum(AdviceStatus)
  @IsOptional()
  status?: AdviceStatus;

  @ApiPropertyOptional({
    description: 'Filtrer par priorité',
    enum: Priority,
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'Filtrer par audience cible',
    enum: TargetAudience,
    isArray: true,
  })
  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  @IsOptional()
  targetAudience?: TargetAudience[];

  @ApiPropertyOptional({
    description: 'Afficher uniquement les conseils actifs',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
