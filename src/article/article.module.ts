import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), CacheModule.register()], // ✅ AJOUT
  controllers: [ArticleController],
  providers: [ArticleService, PrismaService],
  exports: [ArticleService], // Exporter pour être utilisé par d'autres modules (ex: Notification)
})
export class ArticleModule {}
