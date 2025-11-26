// src/users/users.module.ts

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [
    PrismaModule, // ✅ Accès à la base de données
  ],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService], // ✅ Exporté pour être utilisé dans d'autres modules
})
export class UsersModule {}
