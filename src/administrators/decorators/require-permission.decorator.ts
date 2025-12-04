// src/administrators/decorators/require-permission.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { AdminPermissionAction } from '@prisma/client';

/**
 * Decorator pour définir les permissions requises sur une route
 *
 * USAGE :
 * @RequirePermission(AdminPermissionAction.VALIDATE_ORGANIZATION)
 * @Patch('organizations/:id/verify')
 * verifyOrganization(@Param('id') id: string) {
 *   // Seuls les admins avec la permission VALIDATE_ORGANIZATION peuvent accéder
 * }
 *
 * EXPLICATIONS :
 * - SetMetadata stocke des métadonnées sur la route
 * - Ces métadonnées seront lues par le guard AdminPermissionGuard
 * - On peut passer une ou plusieurs permissions
 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: AdminPermissionAction[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
