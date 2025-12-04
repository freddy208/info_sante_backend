// src/categories/categories.module.ts

import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

/**
 * 📂 CATEGORIES MODULE
 *
 * Module de gestion des catégories de santé.
 *
 * FONCTIONNALITÉS :
 * - CRUD catégories avec hiérarchie parent/enfant
 * - Génération automatique de slug
 * - Soft delete (activation/désactivation)
 * - Routes publiques et protégées (Admin)
 *
 * DÉPENDANCES :
 * - PrismaModule : Accès à la base de données
 *
 * ROUTES PUBLIQUES :
 * - GET /categories (liste)
 * - GET /categories/:identifier (détails par ID ou slug)
 *
 * ROUTES ADMIN :
 * - POST /categories (créer)
 * - PATCH /categories/:id (modifier)
 * - DELETE /categories/:id (désactiver)
 * - PATCH /categories/:id/activate (réactiver)
 */
@Module({
  imports: [
    PrismaModule, // ✅ Accès à la base de données
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService, PrismaService],
  exports: [CategoriesService], // ✅ Exporté pour être utilisé dans d'autres modules
})
export class CategoriesModule {}
