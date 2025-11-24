/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/auth/dto/refresh-token.dto.ts

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // ✅ Ajouté

/**
 * 🔄 REFRESH TOKEN DTO
 // eslint-disable-next-line prettier/prettier
 * 
 * Validation du refresh token.
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token invalide' })
  @IsNotEmpty({ message: 'Refresh token requis' })
  refreshToken: string;
}
