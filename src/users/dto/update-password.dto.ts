// src/users/dto/update-password.dto.ts

import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 🔐 UPDATE PASSWORD DTO
 *
 * Validation pour le changement de mot de passe.
 */
export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Mot de passe actuel',
    example: 'OldPassword123!',
  })
  @IsString({ message: 'Le mot de passe actuel doit être une chaîne' })
  @IsNotEmpty({ message: 'Mot de passe actuel requis' })
  currentPassword: string;

  @ApiProperty({
    description:
      'Nouveau mot de passe (min 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial)',
    example: 'NewPassword123!',
    minLength: 8,
    maxLength: 100,
  })
  @IsString({ message: 'Le nouveau mot de passe doit être une chaîne' })
  @IsNotEmpty({ message: 'Nouveau mot de passe requis' })
  @MinLength(8, {
    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(100, {
    message: 'Le nouveau mot de passe ne peut pas dépasser 100 caractères',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  newPassword: string;
}
