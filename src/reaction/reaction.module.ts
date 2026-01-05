import { Module } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { ReactionController } from './reaction.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReactionController],
  providers: [ReactionService, PrismaService],
  exports: [ReactionService], // Exporté pour être utilisé dans d'autres modules
})
export class ReactionModule {}
