import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 📝 REGISTER DTO
 *
 * Validation pour l'inscription d'un utilisateur connecté à une annonce.
 */
export class RegisterDto {
  @ApiProperty({
    description: "ID de l'annonce",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  announcementId: string;

  @ApiPropertyOptional({
    description: "Notes additionnelles pour l'inscription",
    example: 'Allergie aux arachides',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
