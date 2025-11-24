// src/prisma/prisma.module.ts

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * 🌍 PRISMA MODULE GLOBAL
 *
 * @Global() rend ce module disponible PARTOUT dans l'application
 * sans avoir besoin de l'importer dans chaque module.
 *
 * C'est comme déclarer PrismaService "global" - tous les services
 * peuvent l'injecter directement.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
