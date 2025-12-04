// src/organizations/dto/login-organization.dto.ts

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 🔐 LOGIN ORGANIZATION DTO
 *
 * Validation pour la connexion d'une organisation.
 */
export class LoginOrganizationDto {
  @ApiProperty({
    description: "Email de l'organisation",
    example: 'contact@laquintinie.cm',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'SecurePass123!',
  })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  password: string;
}
