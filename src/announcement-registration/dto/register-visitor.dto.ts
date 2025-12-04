import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 🌍 REGISTER VISITOR DTO
 *
 * Validation pour l'inscription d'un visiteur (non connecté) à une annonce.
 */
export class RegisterVisitorDto {
  @ApiProperty({
    description: "ID de l'annonce",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  announcementId: string;

  @ApiProperty({
    description: 'Nom complet du visiteur',
    example: 'Jean Dupont',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  visitorName: string;

  @ApiProperty({
    description: 'Email du visiteur',
    example: 'jean.dupont@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  visitorEmail: string;

  @ApiProperty({
    description: 'Téléphone du visiteur',
    example: '+237699999999',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+237[0-9]{9}$/, {
    message: 'Le téléphone doit être au format camerounais (+237XXXXXXXXX)',
  })
  visitorPhone: string;

  @ApiPropertyOptional({
    description: 'Notes additionnelles',
    example: 'Souhaite une confirmation par SMS',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
