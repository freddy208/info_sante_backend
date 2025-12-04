// src/administrators/entities/administrator.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { AdminRole, AdminStatus } from '@prisma/client';
import { Exclude } from 'class-transformer';

/**
 * Entity Administrator
 *
 * Transforme les données Prisma en réponse API
 * Exclut le mot de passe pour la sécurité
 */
export class AdministratorEntity {
  @ApiProperty({
    description: "ID de l'administrateur",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Email',
    example: 'admin@infosante.cm',
  })
  email: string;

  @Exclude() // ✅ Ne jamais exposer le mot de passe
  password: string;

  @ApiProperty({
    description: 'Prénom',
    example: 'Jean',
  })
  firstName: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Dupont',
  })
  lastName: string;

  @ApiProperty({
    description: 'Numéro de téléphone',
    example: '+237690000000',
    nullable: true,
  })
  phone?: string;

  @ApiProperty({
    description: "URL de l'avatar",
    example: 'https://res.cloudinary.com/.../avatar.jpg',
    nullable: true,
  })
  avatar?: string;

  @ApiProperty({
    description: 'Rôle',
    enum: AdminRole,
    example: AdminRole.MODERATOR,
  })
  role: AdminRole;

  @ApiProperty({
    description: 'Statut actif/inactif',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Date de dernière connexion',
    example: '2024-01-15T10:30:00Z',
    nullable: true,
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'IP de dernière connexion',
    example: '192.168.1.1',
    nullable: true,
  })
  lastLoginIp?: string;

  @ApiProperty({
    description: "ID de l'admin créateur",
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  createdBy?: string;

  @ApiProperty({
    description: 'Statut',
    enum: AdminStatus,
    example: AdminStatus.ACTIVE,
  })
  status: AdminStatus;

  @ApiProperty({
    description: 'Date de suppression (soft delete)',
    example: null,
    nullable: true,
  })
  deletedAt?: Date;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<AdministratorEntity>) {
    Object.assign(this, partial);
  }
}
