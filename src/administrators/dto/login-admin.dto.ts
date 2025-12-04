// src/administrators/dto/login-admin.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO pour la connexion d'un administrateur
 */
export class LoginAdminDto {
  @ApiProperty({
    description: "Email de l'administrateur",
    example: 'admin@infosante.cm',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  password: string;
}
