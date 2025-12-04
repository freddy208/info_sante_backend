// src/administrators/dto/verify-organization.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * DTO pour valider ou rejeter une organisation
 *
 * Utilisé par les admins avec le rôle VALIDATOR ou SUPER_ADMIN
 */
export class VerifyOrganizationDto {
  @ApiProperty({
    description: "Approuver (true) ou rejeter (false) l'organisation",
    example: true,
  })
  @IsBoolean()
  isVerified: boolean;

  @ApiProperty({
    description: 'Commentaire de validation (optionnel)',
    example: 'Documents conformes, organisation validée',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
