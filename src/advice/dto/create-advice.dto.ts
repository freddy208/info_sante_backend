import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, TargetAudience } from '@prisma/client';

/**
 * 💡 CREATE ADVICE DTO
 *
 * Validation pour créer un nouveau conseil de santé.
 */
export class CreateAdviceDto {
  @ApiProperty({
    description: 'ID de la catégorie',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: "L'ID de la catégorie est requis" })
  categoryId: string;

  @ApiProperty({
    description: 'Titre du conseil',
    example: '5 conseils pour prévenir le paludisme',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  title: string;

  @ApiProperty({
    description: 'Contenu du conseil',
    example:
      'Le paludisme est une maladie grave mais préventible. Voici 5 conseils essentiels...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: "URL de l'icône représentatif",
    example: 'https://res.cloudinary.com/.../malaria-prevention-icon.png',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Priorité du conseil',
    enum: Priority,
    example: Priority.HIGH,
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'Audience cible du conseil',
    enum: TargetAudience,
    isArray: true,
    example: [TargetAudience.ADULTS, TargetAudience.CHILDREN],
  })
  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  @IsOptional()
  targetAudience?: TargetAudience[];
}
