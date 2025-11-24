/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/guards/roles.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * 🔑 ROLES GUARD
 *
 * Vérifie que l'utilisateur a le bon rôle pour accéder à la route.
 *
 * ORDRE D'EXÉCUTION :
 * 1. JwtAuthGuard vérifie le token
 * 2. RolesGuard vérifie le rôle
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupérer les rôles requis depuis les métadonnées
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si pas de rôles requis, autoriser
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Récupérer l'utilisateur depuis la requête
    const { user } = context.switchToHttp().getRequest();

    // Vérifier si l'utilisateur a un des rôles requis
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Accès refusé. Rôles requis : ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
