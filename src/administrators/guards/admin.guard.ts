/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/administrators/guards/admin.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserType } from '@prisma/client';

/**
 * Guard pour vérifier que l'utilisateur connecté est un administrateur
 *
 * USAGE :
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * @Get('dashboard')
 * getDashboard() {
 *   // Seuls les administrateurs peuvent accéder
 * }
 *
 * EXPLICATIONS :
 * 1. Le JwtAuthGuard doit être appliqué AVANT (il vérifie le token et remplit request.user)
 * 2. Ce guard vérifie ensuite que request.user.type === 'ADMINISTRATOR'
 * 3. Si ce n'est pas le cas, on lance une ForbiddenException
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    // ✅ 1. Vérifier que l'utilisateur est authentifié
    if (!user) {
      throw new UnauthorizedException('Vous devez être connecté');
    }

    // ✅ 2. Vérifier que c'est un administrateur
    if (user.type !== UserType.ADMINISTRATOR) {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    // ✅ 3. Autoriser l'accès
    return true;
  }
}
