// src/administrators/dto/update-admin.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AdminRole } from '@prisma/client';

/**
 * DTO pour mettre à jour le profil d'un administrateur
 *
 * Seul un SUPER_ADMIN peut changer le rôle d'un admin
 */
export class UpdateAdminDto {
  @ApiProperty({
    description: 'Prénom',
    example: 'Jean',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Dupont',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'Numéro de téléphone',
    example: '+237690000000',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: "URL de l'avatar",
    example: 'https://res.cloudinary.com/.../avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'Rôle (réservé au SUPER_ADMIN)',
    enum: AdminRole,
    required: false,
  })
  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;
}
