import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({})
export class MailModule {
  providers: [MailService, PrismaService];
  exports: [MailService];
}
