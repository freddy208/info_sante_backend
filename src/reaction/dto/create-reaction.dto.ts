import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentType, ReactionType } from '@prisma/client';

/**
 * ❤️ CREATE REACTION DTO
 *
 * Validation pour créer une nouvelle réaction.
 */
export class CreateReactionDto {
  @ApiProperty({
    description: 'Type de contenu',
    enum: ContentType,
    example: ContentType.ARTICLE,
  })
  @IsEnum(ContentType, { message: 'Type de contenu invalide' })
  @IsNotEmpty({ message: 'Le type de contenu est requis' })
  contentType: ContentType;

  @ApiProperty({
    description: 'ID du contenu',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: "L'ID du contenu est requis" })
  contentId: string;

  @ApiProperty({
    description: 'Type de réaction',
    enum: ReactionType,
    example: ReactionType.LIKE,
  })
  @IsEnum(ReactionType, { message: 'Type de réaction invalide' })
  @IsNotEmpty({ message: 'Le type de réaction est requis' })
  type: ReactionType;
}
