// src/organizations/entities/organization.entity.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType, OrganizationStatus } from '@prisma/client';
import { Exclude } from 'class-transformer';

/**
 * 🏥 ORGANIZATION ENTITY
 *
 * Représentation d'une organisation (hôpital, ONG, clinique, etc.)
 */
export class OrganizationEntity {
  @ApiProperty({
    description: "ID unique de l'organisation",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: "Nom de l'organisation",
    example: 'Hôpital Laquintinie',
  })
  name: string;

  @ApiProperty({
    description: "Email de l'organisation",
    example: 'contact@laquintinie.cm',
  })
  email: string;

  @Exclude() // ❌ Ne jamais exposer le mot de passe
  password: string;

  @ApiProperty({
    description: "Type d'organisation",
    enum: OrganizationType,
    example: OrganizationType.HOSPITAL_PUBLIC,
  })
  type: OrganizationType;

  @ApiProperty({
    description: 'Téléphone',
    example: '+237 6 99 99 99 99',
  })
  phone: string;

  @ApiPropertyOptional({
    description: 'WhatsApp',
    example: '+237 6 99 99 99 99',
  })
  whatsapp: string | null;

  @ApiPropertyOptional({
    description: 'URL du logo',
  })
  logo: string | null;

  @ApiPropertyOptional({
    description: "URL de l'image de couverture",
  })
  coverImage: string | null;

  @ApiPropertyOptional({
    description: "Description de l'organisation",
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Site web',
    example: 'https://laquintinie.cm',
  })
  website: string | null;

  @ApiProperty({
    description: 'Adresse',
    example: 'Rue de la République, Deido',
  })
  address: string;

  @ApiProperty({
    description: 'Ville',
    example: 'Douala',
  })
  city: string;

  @ApiProperty({
    description: 'Région',
    example: 'Littoral',
  })
  region: string;

  @ApiPropertyOptional({
    description: 'Latitude',
    example: 4.0511,
  })
  latitude: number | null;

  @ApiPropertyOptional({
    description: 'Longitude',
    example: 9.7679,
  })
  longitude: number | null;

  @ApiProperty({
    description: "Numéro d'enregistrement",
    example: 'RC/DLA/2023/B/1234',
  })
  registrationNumber: string;

  @ApiPropertyOptional({
    description: "URL du document d'agrément (PDF)",
  })
  licenseDocument: string | null;

  @ApiProperty({
    description: 'Organisation vérifiée par un administrateur ?',
    example: false,
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Date de vérification',
  })
  verifiedAt: Date | null;

  @ApiPropertyOptional({
    description: "ID de l'administrateur qui a vérifié",
  })
  verifiedBy: string | null;

  @ApiPropertyOptional({
    description: "Heures d'ouverture (JSON)",
    example: {
      lundi: '08:00-17:00',
      mardi: '08:00-17:00',
      mercredi: '08:00-17:00',
      jeudi: '08:00-17:00',
      vendredi: '08:00-17:00',
      samedi: '08:00-12:00',
      dimanche: 'Fermé',
    },
  })
  openingHours: any;

  @ApiProperty({
    description: 'Urgences disponibles 24h/24 ?',
    example: true,
  })
  emergencyAvailable: boolean;

  @ApiProperty({
    description: 'Assurances acceptées',
    example: ['CNPS', 'ALLIANZ', 'AXA'],
    type: [String],
  })
  insuranceAccepted: string[];

  @ApiPropertyOptional({
    description: 'Note moyenne (0-5)',
    example: 4.5,
  })
  rating: number | null;

  @ApiProperty({
    description: "Nombre total d'avis",
    example: 128,
  })
  totalReviews: number;

  @ApiProperty({
    description: "Nombre total d'annonces publiées",
    example: 15,
  })
  totalAnnouncements: number;

  @ApiProperty({
    description: "Nombre total d'articles publiés",
    example: 8,
  })
  totalArticles: number;

  @ApiProperty({
    description: "Statut de l'organisation",
    enum: OrganizationStatus,
    example: OrganizationStatus.PENDING,
  })
  status: OrganizationStatus;

  @ApiPropertyOptional({
    description: 'Raison de la suspension',
  })
  suspensionReason: string | null;

  @ApiPropertyOptional({
    description: 'Date de suspension',
  })
  suspendedAt: Date | null;

  @ApiPropertyOptional({
    description: "ID de l'administrateur qui a suspendu",
  })
  suspendedBy: string | null;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-11-28T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2025-11-28T00:00:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<OrganizationEntity>) {
    Object.assign(this, partial);
  }
}
