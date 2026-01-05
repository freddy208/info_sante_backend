import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationType, DeliveryStatus } from '@prisma/client';

/**
 * 🔍 QUERY NOTIFICATION DTO
 *
 * Validation pour les paramètres de requête (listes).
 */
export class QueryNotificationDto {
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
    description: 'Filtrer par type de notification',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Filtrer par statut de lecture',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({
    description: "Filtrer par statut d'envoi",
    enum: DeliveryStatus,
  })
  @IsEnum(DeliveryStatus)
  @IsOptional()
  deliveryStatus?: DeliveryStatus;

  @ApiPropertyOptional({
    description: 'Recherche dans le titre ou le contenu',
    example: 'santé',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par date de création (à partir de)',
    example: '2025-11-01',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "Filtrer par date de création (jusqu'à)",
    example: '2025-11-30',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
