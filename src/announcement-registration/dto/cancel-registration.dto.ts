import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ❌ CANCEL REGISTRATION DTO
 *
 * Validation pour l'annulation d'une inscription.
 */
export class CancelRegistrationDto {
  @ApiPropertyOptional({
    description: "Raison de l'annulation",
    example: 'Empêchement de dernière minute',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  cancellationReason?: string;
}
