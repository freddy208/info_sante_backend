import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationStatus } from '@prisma/client';

/**
 * ✏️ UPDATE REGISTRATION DTO
 *
 * Validation pour la mise à jour d'une inscription par l'organisation.
 */
export class UpdateRegistrationDto {
  @ApiPropertyOptional({
    description: "Statut de l'inscription",
    enum: RegistrationStatus,
  })
  @IsEnum(RegistrationStatus)
  @IsOptional()
  status?: RegistrationStatus;

  @ApiPropertyOptional({
    description: "Notes de l'organisation",
    example: 'Participant confirmé par téléphone',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Date de présence effective',
    example: '2024-12-10T10:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  attendedAt?: string;
}
