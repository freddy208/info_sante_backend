/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/common/guards/jwt-auth.guard.ts

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 🛡️ JWT AUTH GUARD
 *
 * Vérifie que l'utilisateur est authentifié avec un JWT valide.
 * Les routes marquées @Public() ne nécessitent pas d'authentification.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Vérifie si la route peut être activée
   */
  canActivate(context: ExecutionContext) {
    // Vérifier si la route est publique
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si publique, autoriser l'accès
    if (isPublic) {
      return true;
    }

    // Sinon, vérifier le JWT
    return super.canActivate(context);
  }

  /**
   * Gère les erreurs d'authentification
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest(err: any, user: any, info: any) {
    // Si erreur ou pas d'utilisateur, rejeter
    if (err || !user) {
      throw err || new UnauthorizedException('Token invalide ou expiré');
    }

    return user;
  }
}
