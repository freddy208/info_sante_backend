// src/organizations/dto/update-password.dto.ts

import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 🔑 UPDATE PASSWORD DTO
 *
 * Validation pour changer le mot de passe d'une organisation.
 */
export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Mot de passe actuel',
    example: 'OldPassword123!',
  })
  @IsString({
    message: 'Le mot de passe actuel doit être une chaîne de caractères',
  })
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  currentPassword: string;

  @ApiProperty({
    description:
      'Nouveau mot de passe (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString({
    message: 'Le nouveau mot de passe doit être une chaîne de caractères',
  })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(8, {
    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  newPassword: string;
}
