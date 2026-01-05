import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, ContentType } from '@prisma/client';

/**
 * 📬 CREATE NOTIFICATION DTO
 *
 * Validation pour créer une nouvelle notification.
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: "ID de l'utilisateur destinataire",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: "L'ID de l'utilisateur est requis" })
  userId: string;

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
    example: 'Nouvel article de santé publié',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @ApiProperty({
    description: 'Contenu de la notification',
    example: 'Découvrez les derniers conseils sur la santé mentale',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le contenu est requis' })
  body: string;

  @ApiPropertyOptional({
    description: 'Type de contenu associé',
    enum: ContentType,
  })
  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @ApiPropertyOptional({
    description: 'ID du contenu associé',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional({
    description: "URL de l'image associée",
    example: 'https://res.cloudinary.com/.../notification-image.jpg',
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
}
