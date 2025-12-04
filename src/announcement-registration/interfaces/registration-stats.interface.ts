import { ApiProperty } from '@nestjs/swagger';

/**
 * 📊 REGISTRATION STATS INTERFACE
 *
 * Interface pour les statistiques d'inscription d'une annonce.
 */
export class RegistrationStats {
  @ApiProperty({ description: 'Total des inscriptions', example: 50 })
  total: number;

  @ApiProperty({ description: 'Inscriptions en attente', example: 5 })
  pending: number;

  @ApiProperty({ description: 'Inscriptions confirmées', example: 40 })
  confirmed: number;

  @ApiProperty({ description: 'Inscriptions annulées', example: 3 })
  cancelled: number;

  @ApiProperty({ description: 'Participants présents', example: 35 })
  attended: number;

  @ApiProperty({ description: 'Places restantes', example: 10 })
  remainingCapacity: number;
}
