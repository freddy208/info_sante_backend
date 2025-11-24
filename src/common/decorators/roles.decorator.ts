// src/common/decorators/roles.decorator.ts

import { SetMetadata } from '@nestjs/common';

/**
 * 🔑 DECORATOR @Roles
 *
 * Définit les rôles requis pour accéder à une route.
 *
 * UTILISATION :
 * @Roles('ADMIN', 'SUPER_ADMIN')
 * @Get('admin/dashboard')
 * getAdminDashboard() {
 *   return 'Admin only';
 * }
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
