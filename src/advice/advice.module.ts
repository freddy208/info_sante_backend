import { Module } from '@nestjs/common';
import { AdviceService } from './advice.service';
import { AdviceController } from './advice.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdviceController],
  providers: [AdviceService, PrismaService],
  exports: [AdviceService], // Exporté pour être utilisé dans d'autres modules (ex: Notification)
})
export class AdviceModule {}
