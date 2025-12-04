// src/administrators/entities/admin-permission.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { AdminPermissionResource, AdminPermissionAction } from '@prisma/client';

/**
 * Entity AdministratorPermission
 *
 * Représente les permissions d'un administrateur
 */
export class AdminPermissionEntity {
  @ApiProperty({
    description: 'ID de la permission',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: "ID de l'administrateur",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  administratorId: string;

  @ApiProperty({
    description: 'Ressource concernée',
    enum: AdminPermissionResource,
    example: AdminPermissionResource.ORGANIZATION,
  })
  resource: AdminPermissionResource;

  @ApiProperty({
    description: 'Actions autorisées',
    enum: AdminPermissionAction,
    isArray: true,
    example: [
      AdminPermissionAction.VIEW_ORGANIZATIONS,
      AdminPermissionAction.VALIDATE_ORGANIZATION,
    ],
  })
  actions: AdminPermissionAction[];

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de mise à jour',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<AdminPermissionEntity>) {
    Object.assign(this, partial);
  }
}
