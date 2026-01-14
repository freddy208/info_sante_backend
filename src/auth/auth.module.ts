/* eslint-disable @typescript-eslint/require-await */
// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtOrganizationStrategy } from './strategies/jwt-organization.strategy';
import { JwtAdminStrategy } from './strategies/jwt-admin.strategy';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [
    PrismaModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: {
          expiresIn: config.get('jwt.expiresIn'),
        },
      }),
    }),
  ],

  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtOrganizationStrategy,
    JwtAdminStrategy,
    MailService,
  ],
  exports: [AuthService, JwtStrategy, JwtAdminStrategy],
})
export class AuthModule {}
