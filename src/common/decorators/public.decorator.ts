// src/common/decorators/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

/**
 * 🌍 DECORATOR @Public
 *
 * Marque une route comme publique (pas besoin d'authentification).
 *
 * UTILISATION :
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
