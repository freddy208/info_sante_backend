/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadData } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma.service';
import { REDIS_CLIENT } from 'src/redis/redis.constants';
import Redis from 'ioredis';

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
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

    const key = `admin:${payload.sub}`;

    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const admin = await this.prisma.administrator.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive || admin.status === 'DELETED') {
      throw new UnauthorizedException();
    }

    await this.redis.set(key, JSON.stringify(admin), 'EX', 180);

    return admin;
  }
}
