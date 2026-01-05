import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

/**
 * 🔖 CREATE BOOKMARK DTO
 *
 * Validation pour créer un nouveau favori.
 */
export class CreateBookmarkDto {
  @ApiProperty({
    description: 'Type de contenu à mettre en favori',
    enum: ContentType,
    example: ContentType.ARTICLE,
  })
  @IsEnum(ContentType, { message: 'Type de contenu invalide' })
  @IsNotEmpty({ message: 'Le type de contenu est requis' })
  contentType: ContentType;

  @ApiProperty({
    description: 'ID du contenu à mettre en favori',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: "L'ID du contenu est requis" })
  contentId: string;
}
