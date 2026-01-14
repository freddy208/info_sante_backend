/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadData } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma.service';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class JwtOrganizationStrategy extends PassportStrategy(
  Strategy,
  'jwt-organization',
) {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayloadData) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }

    const key = `org:${payload.sub}`;

    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        isVerified: true,
      },
    });

    if (!org || org.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    await this.redis.set(key, JSON.stringify(org), 'EX', 300);

    return org;
  }
}
