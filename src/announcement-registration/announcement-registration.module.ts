import { Module } from '@nestjs/common';
import { AnnouncementRegistrationService } from './announcement-registration.service';
import { AnnouncementRegistrationController } from './announcement-registration.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnnouncementRegistrationController],
  providers: [AnnouncementRegistrationService, PrismaService],
  exports: [AnnouncementRegistrationService], // Exporté pour être utilisé dans d'autres modules
})
export class AnnouncementRegistrationModule {}
