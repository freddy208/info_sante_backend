import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsObject,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ValidateNested,
} from 'class-validator';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, ContentType } from '@prisma/client';
import { FiltersDto } from './filters.dto';

/**
 * 📨 BULK NOTIFICATION DTO
 *
 * Validation pour envoyer des notifications en masse.
 */
export class BulkNotificationDto {
  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    example: NotificationType.NEW_ANNOUNCEMENT,
  })
  @IsEnum(NotificationType, { message: 'Type de notification invalide' })
  @IsNotEmpty({ message: 'Le type de notification est requis' })
  type: NotificationType;

  @ApiProperty({
    description: 'Titre de la notification',
    example: 'Nouvelle campagne de vaccination',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @ApiProperty({
    description: 'Contenu de la notification',
    example: 'Une nouvelle campagne de vaccination contre la grippe est lancée',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le contenu est requis' })
  body: string;

  @ApiPropertyOptional({
    description: "URL de l'image associée",
    example: 'https://res.cloudinary.com/.../vaccine-campaign.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Données additionnelles (JSON)',
    example: { action: 'view_campaign', campaignId: '123' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiProperty({
    description: 'Liste des IDs des utilisateurs destinataires',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'La liste des utilisateurs est requise' })
  userIds: string[];
}

/**
 * 📨 CAMPAIGN NOTIFICATION DTO
 *
 * Validation pour envoyer des notifications à tous les utilisateurs.
 */
export class CampaignNotificationDto {
  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    example: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType, { message: 'Type de notification invalide' })
  @IsNotEmpty({ message: 'Le type de notification est requis' })
  type: NotificationType;

  @ApiProperty({
    description: 'Titre de la notification',
    example: 'Maintenance prévue de la plateforme',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @ApiProperty({
    description: 'Contenu de la notification',
    example: 'La plateforme sera en maintenance le 15 décembre de 2h à 4h',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le contenu est requis' })
  body: string;

  @ApiPropertyOptional({
    description: "URL de l'image associée",
    example: 'https://res.cloudinary.com/.../maintenance.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Données additionnelles (JSON)',
    example: { action: 'view_maintenance_info' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Filtres pour cibler des utilisateurs spécifiques',
    type: FiltersDto,
  })
  @IsOptional()
  filters?: FiltersDto;
}

/**
 * 📨 CONTENT NOTIFICATION DTO
 *
 * Validation pour envoyer des notifications liées à du contenu.
 */
export class ContentNotificationDto {
  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    example: NotificationType.NEW_ARTICLE,
  })
  @IsEnum(NotificationType, { message: 'Type de notification invalide' })
  @IsNotEmpty({ message: 'Le type de notification est requis' })
  type: NotificationType;

  @ApiProperty({
    description: 'Titre de la notification',
    example: 'Nouvel article publié',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @ApiProperty({
    description: 'Contenu de la notification',
    example: 'Découvrez notre dernier article sur la prévention du paludisme',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le contenu est requis' })
  body: string;

  @ApiProperty({
    description: 'Type de contenu associé',
    enum: ContentType,
    example: ContentType.ARTICLE,
  })
  @IsEnum(ContentType)
  @IsNotEmpty({ message: 'Le type de contenu est requis' })
  contentType: ContentType;

  @ApiProperty({
    description: 'ID du contenu associé',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsNotEmpty({ message: "L'ID du contenu est requis" })
  contentId: string;

  @ApiPropertyOptional({
    description: "URL de l'image associée",
    example: 'https://res.cloudinary.com/.../malaria-prevention.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Données additionnelles (JSON)',
    example: { action: 'view_article', articleId: '123' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Filtres pour cibler des utilisateurs spécifiques',
    type: FiltersDto,
  })
  @IsOptional()
  filters?: FiltersDto;
}
