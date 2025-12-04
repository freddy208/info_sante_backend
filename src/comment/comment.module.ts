import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommentController],
  providers: [CommentService, PrismaService],
  exports: [CommentService], // Exporté pour être utilisé dans d'autres modules
})
export class CommentModule {}
