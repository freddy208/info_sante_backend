/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/auth/dto/login.dto.ts

import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // ✅ Ajouté

/**
 * 🔐 LOGIN DTO
 *
 * Validation des données de connexion.
 */
export class LoginDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'Email requis' })
  email: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur",
    example: 'Password123!',
    format: 'password',
  })
  @IsString({ message: 'Mot de passe invalide' })
  @IsNotEmpty({ message: 'Mot de passe requis' })
  password: string;
}
