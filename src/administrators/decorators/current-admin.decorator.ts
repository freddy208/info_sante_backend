// src/administrators/decorators/current-admin.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator pour récupérer l'administrateur connecté
 *
 * USAGE :
 * @Get('me')
 * getProfile(@CurrentAdmin() admin: { sub: string, type: UserType }) {
 *   return this.service.getProfile(admin.sub);
 * }
 *
 * EXPLICATIONS :
 * - createParamDecorator permet de créer un decorator personnalisé
 * - ExecutionContext donne accès à la requête HTTP
 * - On récupère le user depuis request.user (mis par le JwtAuthGuard)
 */
export const CurrentAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return request.user; // { sub: adminId, type: 'ADMINISTRATOR' }
  },
);
