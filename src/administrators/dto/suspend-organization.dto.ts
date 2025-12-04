// src/administrators/dto/suspend-organization.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO pour suspendre une organisation
 *
 * Nécessite la permission SUSPEND_ORGANIZATION
 */
export class SuspendOrganizationDto {
  @ApiProperty({
    description: 'Raison de la suspension',
    example: "Non-respect des conditions d'utilisation",
  })
  @IsString()
  @IsNotEmpty({ message: 'La raison de la suspension est requise' })
  reason: string;
}
