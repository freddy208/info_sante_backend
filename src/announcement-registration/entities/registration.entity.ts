import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationStatus } from '@prisma/client';

/**
 * 📝 REGISTRATION ENTITY
 *
 * Représentation d'une inscription pour l'API.
 */
export class RegistrationEntity {
  @ApiProperty({ description: "ID unique de l'inscription" })
  id: string;

  @ApiProperty({ description: "ID de l'annonce" })
  announcementId: string;

  @ApiPropertyOptional({ description: "ID de l'utilisateur (si connecté)" })
  userId?: string | null;

  @ApiPropertyOptional({ description: 'Nom du visiteur (si non connecté)' })
  visitorName?: string | null;

  @ApiPropertyOptional({ description: 'Email du visiteur' })
  visitorEmail?: string | null;

  @ApiPropertyOptional({ description: 'Téléphone du visiteur' })
  visitorPhone?: string | null;

  @ApiProperty({
    description: "Statut de l'inscription",
    enum: RegistrationStatus,
  })
  status: RegistrationStatus;

  @ApiPropertyOptional({ description: 'Date de confirmation' })
  confirmedAt?: Date | null;

  @ApiPropertyOptional({ description: "Date d'annulation" })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({ description: "Raison de l'annulation" })
  cancellationReason?: string | null;

  @ApiPropertyOptional({ description: 'Date de présence effective' })
  attendedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Notes additionnelles' })
  notes?: string | null;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt: Date;

  // Inclusions optionnelles
  @ApiPropertyOptional({ description: "Détails de l'annonce" })
  announcement?: any;

  @ApiPropertyOptional({ description: "Détails de l'utilisateur" })
  user?: any;

  constructor(partial: Partial<RegistrationEntity>) {
    Object.assign(this, partial);
  }
}
