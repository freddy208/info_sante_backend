// src/users/entities/user.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus, Gender } from '@prisma/client';

/**
 * 👤 USER ENTITY
 *
 * Représentation d'un utilisateur pour les réponses API.
 * IMPORTANT : Ne contient PAS de données sensibles (password, tokens).
 */
export class UserEntity {
  @ApiProperty({
    description: "ID unique de l'utilisateur",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Adresse email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiPropertyOptional({ description: 'Prénom', example: 'John' })
  firstName: string | null;

  @ApiPropertyOptional({ description: 'Nom de famille', example: 'Doe' })
  lastName: string | null;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone',
    example: '+237612345678',
  })
  phone: string | null;

  @ApiPropertyOptional({
    description: "URL de l'avatar",
    example: 'https://cloudinary.com/...',
  })
  avatar: string | null;

  @ApiPropertyOptional({
    description: 'Date de naissance',
    example: '1990-01-15',
  })
  dateOfBirth: Date | null;

  @ApiPropertyOptional({
    description: 'Genre',
    enum: Gender,
    example: Gender.MALE,
  })
  gender: Gender | null;

  @ApiPropertyOptional({ description: 'Ville de résidence', example: 'Douala' })
  city: string | null;

  @ApiPropertyOptional({
    description: 'Région de résidence',
    example: 'Littoral',
  })
  region: string | null;

  @ApiProperty({ description: 'Email vérifié ?', example: false })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Téléphone vérifié ?', example: false })
  isPhoneVerified: boolean;

  @ApiProperty({
    description: 'Statut du compte',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiPropertyOptional({
    description: 'Date de dernière connexion',
    example: '2025-11-24T12:00:00.000Z',
  })
  lastLoginAt: Date | null;

  @ApiProperty({
    description: 'Date de création du compte',
    example: '2025-11-24T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2025-11-24T12:00:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
