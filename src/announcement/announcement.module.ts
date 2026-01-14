import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [PrismaModule, CacheModule.register()],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, PrismaService],
  exports: [AnnouncementService], // Exporter pour être utilisé par d'autres modules (ex: Notification)
})
export class AnnouncementModule {}
