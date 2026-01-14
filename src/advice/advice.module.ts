import { Module } from '@nestjs/common';
import { AdviceService } from './advice.service';
import { AdviceController } from './advice.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), CacheModule.register()], // ✅ AJOUT
  controllers: [AdviceController],
  providers: [AdviceService, PrismaService],
  exports: [AdviceService], // Exporté pour être utilisé dans d'autres modules (ex: Notification)
})
export class AdviceModule {}
