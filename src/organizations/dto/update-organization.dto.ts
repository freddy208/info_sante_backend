// src/organizations/dto/update-organization.dto.ts

import { PartialType, OmitType } from '@nestjs/swagger';
import { RegisterOrganizationDto } from './register-organization.dto';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ✏️ UPDATE ORGANIZATION DTO
 *
 * Validation pour la mise à jour d'une organisation.
 * Tous les champs sont optionnels sauf email et password.
 */
export class UpdateOrganizationDto extends PartialType(
  OmitType(RegisterOrganizationDto, [
    'email',
    'password',
    'registrationNumber',
  ] as const),
) {
  @ApiPropertyOptional({
    description: 'URL du logo',
  })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({
    description: "URL de l'image de couverture",
  })
  @IsString()
  @IsOptional()
  coverImage?: string;
}
