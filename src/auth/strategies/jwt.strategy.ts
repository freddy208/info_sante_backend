// src/auth/strategies/jwt.strategy.ts
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadData } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma.service';
import { REDIS_CLIENT } from 'src/redis/redis.constants';
import Redis from 'ioredis';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
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

    const key = `user:${payload.sub}`;

    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
        city: true,
        region: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    await this.redis.set(key, JSON.stringify(user), 'EX', 300);

    return user;
  }
}
