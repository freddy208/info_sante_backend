/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/administrators/guards/admin-permission.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'prisma/prisma.service';
import { AdminPermissionAction, AdminRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

/**
 * Guard pour vérifier les permissions d'un administrateur
 *
 * USAGE :
 * @UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionGuard)
 * @RequirePermission(AdminPermissionAction.VALIDATE_ORGANIZATION)
 * @Patch('organizations/:id/verify')
 * verifyOrganization() {
 *   // Seuls les admins avec VALIDATE_ORGANIZATION peuvent accéder
 * }
 *
 * EXPLICATIONS :
 * 1. Le Reflector permet de lire les métadonnées (@RequirePermission)
 * 2. On récupère les permissions de l'admin depuis la BDD
 * 3. Si SUPER_ADMIN → accès automatique (tous les droits)
 * 4. Sinon, on vérifie que l'admin a AU MOINS UNE des permissions requises
 */
@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ✅ 1. Récupérer les permissions requises depuis le decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      AdminPermissionAction[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // ✅ 2. Si pas de permissions requises, autoriser l'accès
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // ✅ 3. Récupérer l'admin depuis la requête
    const request = context.switchToHttp().getRequest();
    const { user } = request; // { sub: adminId, type: 'ADMINISTRATOR' }

    // ✅ 4. Récupérer l'admin complet depuis la BDD
    const admin = await this.prisma.administrator.findUnique({
      where: { id: user.sub },
      include: {
        permissions: true,
      },
    });

    if (!admin) {
      throw new ForbiddenException('Administrateur non trouvé');
    }

    // ✅ 5. SUPER_ADMIN a tous les droits
    if (admin.role === AdminRole.SUPER_ADMIN) {
      return true;
    }

    // ✅ 6. Récupérer toutes les permissions de l'admin
    const adminPermissions = admin.permissions.flatMap(
      (permission) => permission.actions,
    );

    // ✅ 7. Vérifier que l'admin a AU MOINS UNE des permissions requises
    const hasPermission = requiredPermissions.some((requiredPermission) =>
      adminPermissions.includes(requiredPermission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        "Vous n'avez pas les permissions nécessaires pour effectuer cette action",
      );
    }

    // ✅ 8. Autoriser l'accès
    return true;
  }
}
