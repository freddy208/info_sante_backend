// src/administrators/dto/register-admin.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { AdminRole } from '@prisma/client';

/**
 * DTO pour l'inscription d'un nouvel administrateur
 *
 * IMPORTANT : Seul un SUPER_ADMIN peut créer un nouvel admin
 */
export class RegisterAdminDto {
  @ApiProperty({
    description: "Email de l'administrateur",
    example: 'admin@infosante.cm',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({
    description: 'Mot de passe (minimum 8 caractères)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  password: string;

  @ApiProperty({
    description: "Prénom de l'administrateur",
    example: 'Jean',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  firstName: string;

  @ApiProperty({
    description: "Nom de l'administrateur",
    example: 'Dupont',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  lastName: string;

  @ApiProperty({
    description: "Numéro de téléphone de l'administrateur",
    example: '+237690000000',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: "Rôle de l'administrateur",
    enum: AdminRole,
    example: AdminRole.MODERATOR,
  })
  @IsEnum(AdminRole, { message: 'Rôle invalide' })
  @IsNotEmpty({ message: 'Le rôle est requis' })
  role: AdminRole;
}
