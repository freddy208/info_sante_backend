// src/administrators/dto/suspend-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO pour suspendre un utilisateur
 *
 * Nécessite la permission SUSPEND_USER
 */
export class SuspendUserDto {
  @ApiProperty({
    description: 'Raison de la suspension',
    example: 'Comportement inapproprié sur la plateforme',
  })
  @IsString()
  @IsNotEmpty({ message: 'La raison de la suspension est requise' })
  reason: string;
}
