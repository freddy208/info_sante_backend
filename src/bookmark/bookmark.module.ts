import { Module } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkController } from './bookmark.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [PrismaModule, CacheModule.register()],
  controllers: [BookmarkController],
  providers: [BookmarkService, PrismaService],
  exports: [BookmarkService], // Exporté pour être utilisé dans d'autres modules
})
export class BookmarkModule {}
