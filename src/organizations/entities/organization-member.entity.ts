// src/organizations/entities/organization-member.entity.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 👥 ORGANIZATION MEMBER ENTITY
 *
 * Représentation d'un membre d'une organisation
 */
export class OrganizationMemberEntity {
  @ApiProperty({
    description: 'ID unique du membre',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: "ID de l'organisation",
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Prénom',
    example: 'Jean',
  })
  firstName: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Mbarga',
  })
  lastName: string;

  @ApiProperty({
    description: 'Email',
    example: 'jean.mbarga@laquintinie.cm',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Téléphone',
    example: '+237 6 99 99 99 99',
  })
  phone: string | null;

  @ApiPropertyOptional({
    description: 'Poste/Fonction',
    example: 'Directeur Médical',
  })
  position: string | null;

  @ApiProperty({
    description: 'Membre actif ?',
    example: true,
  })
  isActive: boolean;

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

  constructor(partial: Partial<OrganizationMemberEntity>) {
    Object.assign(this, partial);
  }
}
