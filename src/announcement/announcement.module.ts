import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, PrismaService],
  exports: [AnnouncementService], // Exporter pour être utilisé par d'autres modules (ex: Notification)
})
export class AnnouncementModule {}
