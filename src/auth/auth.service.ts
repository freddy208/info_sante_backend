/* eslint-disable prettier/prettier */
 
 
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtPayloadData } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import {
  UserStatus,
  ActorType,
  ActionType,
  ResourceType,
  AuditStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import type { SignOptions } from 'jsonwebtoken';
import { RedisService } from '../redis/redis.service';
import { randomUUID } from 'crypto';

/**
 * ✅ Interface stricte pour les données d'Audit Log
 */
interface CreateAuditLogData {
  actorType: ActorType;
  actorId: string;
  action: ActionType;
  resourceType: ResourceType;
  resourceId?: string;
  status?: AuditStatus;
  changes?: Prisma.InputJsonValue; // <--- ICI
  metadata?: Prisma.InputJsonValue; // <--- ET ICI
  ipAddress?: string;
  errorMessage?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  // =====================================
  // 📝 INSCRIPTION
  // =====================================

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, phone, firstName, lastName, city, region } =
      registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true, deletedAt: true },
    });

    if (existingUser) {
      if (existingUser.status !== UserStatus.DELETED) {
        throw new ConflictException('Un compte existe déjà avec cet email');
      }
      if (existingUser.status === UserStatus.DELETED) {
        throw new ConflictException(
          'Compte supprimé existant. Contactez le support.',
        );
      }
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
        select: { id: true, status: true },
      });
      if (existingPhone && existingPhone.status !== UserStatus.DELETED) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    const hashedPassword = await this.hashPassword(password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          city,
          region,
          status: UserStatus.ACTIVE,
        },
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

      const tokens = await this.generateTokens(user.id, user.email);

      await this.createAuditLog({
        actorType: ActorType.USER,
        actorId: user.id,
        action: ActionType.CREATE,
        resourceType: ResourceType.USER,
        resourceId: user.id,
        status: AuditStatus.SUCCESS,
        metadata: { email: user.email, source: 'WEB' } as Prisma.InputJsonValue,
      });

      this.logger.log(`✅ Nouvel utilisateur : ${user.email}`);
      try {
        await this.prisma.userPreference.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            categories: [],
            organizations: [],
            cities: user.city ? [user.city] : [],
            regions: user.region ? [user.region] : [],
            notificationsEnabled: true,
            emailNotifications: true,
            pushNotifications: true,
            language: 'FR',
          },
        });
      } catch (error) {
        this.logger.warn(
          `Init préférences échouée pour user ${user.id} (safe)`,
        );
      }

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status,
          city: user.city,
          region: user.region,
        },
      };
    } catch (error) {
      // ✅ FIX SÉCURITÉ : Vérification 'instanceof Error' pour éviter l'erreur ESLint
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`❌ Erreur inscription : ${message}`);
      throw new BadRequestException('Erreur lors de la création du compte');
    }
  }

  // =====================================
  // 🔐 CONNEXION
  // =====================================

  async login(loginDto: LoginDto, ipAddress?: string): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
        deletedAt: true,
        city: true,
        region: true,
      },
    });

    if (!user)
      throw new UnauthorizedException('Email ou mot de passe incorrect');

    if (user.status === UserStatus.DELETED || user.deletedAt) {
      throw new ForbiddenException(
        'Ce compte a été supprimé. Contactez le support.',
      );
    }
    if (user.status === UserStatus.SUSPENDED)
      throw new ForbiddenException('Compte suspendu.');
    if (user.status === UserStatus.INACTIVE)
      throw new ForbiddenException('Compte inactif.');

    const isPasswordValid = await this.comparePasswords(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      await this.createAuditLog({
        actorType: ActorType.USER,
        actorId: user.id,
        action: ActionType.LOGIN,
        resourceType: ResourceType.USER,
        resourceId: user.id,
        status: AuditStatus.FAILURE,
        metadata: { reason: 'Invalid password', ipAddress } as Prisma.InputJsonValue,
      });
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });

    await this.createAuditLog({
      actorType: ActorType.USER,
      actorId: user.id,
      action: ActionType.LOGIN,
      resourceType: ResourceType.USER,
      resourceId: user.id,
      status: AuditStatus.SUCCESS,
      metadata: { ipAddress } as Prisma.InputJsonValue,
    });

    this.logger.log(`✅ Connexion : ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        city: user.city,
        region: user.region,
      },
    };
  }

  // =====================================
  // 🔄 REFRESH TOKEN
  // =====================================

  async refreshTokens(refreshToken: string) {
    let payload: JwtPayloadData;

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Token invalide');
    }

    const redis = this.redisService.getClient();
    const key = `refresh:${payload.sub}:${payload.jti}`;

    const exists = await redis.get(key);
    if (!exists) {
      throw new UnauthorizedException('Refresh token expiré ou révoqué');
    }

    // 🔁 ROTATION
    await redis.del(key);

    const newAccessToken = await this.generateAccessToken(
      payload.sub,
      payload.email,
    );

    const newRefreshToken = await this.generateRefreshToken(
      payload.sub,
      payload.email,
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // =====================================
  // 🔑 MOT DE PASSE OUBLIÉ
  // =====================================

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, status: true },
    });

    if (!user) {
      this.logger.warn(`Tentative reset email inconnu : ${email}`);
      return { message: 'Si cet email existe, un lien a été envoyé.' };
    }

    if (user.status !== UserStatus.ACTIVE)
      return { message: 'Compte inactif.' };

    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await this.mailService.sendPasswordReset(
      user.email,
      user.firstName || 'Utilisateur',
      resetLink,
    );

    this.logger.log(`✅ Reset email envoyé à : ${user.email}`);
    return {
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    };
  }

  // =====================================
  // 🔁 RÉINITIALISER MOT DE PASSE
  // =====================================

  async resetPassword(dto: ResetPasswordDto) {
    const { email, token, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordResetToken: true,
        passwordResetExpires: true,
        status: true,
      },
    });

    if (!user)
      throw new BadRequestException(
        'Utilisateur introuvable ou lien invalide.',
      );
    if (!user.passwordResetToken || !user.passwordResetExpires) {
      throw new BadRequestException(
        'Aucune demande de réinitialisation en cours.',
      );
    }
    if (new Date() > user.passwordResetExpires) {
      throw new BadRequestException('Le lien de réinitialisation a expiré.');
    }

    const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
    if (!isTokenValid) {
      this.logger.warn(`❌ Tentative reset token invalide pour ${email}`);
      throw new BadRequestException('Lien de réinitialisation invalide.');
    }

    const hashedPassword = await this.hashPassword(password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await this.createAuditLog({
      actorType: ActorType.USER,
      actorId: user.id,
      action: ActionType.UPDATE,
      resourceType: ResourceType.USER,
      resourceId: user.id,
      status: AuditStatus.SUCCESS,
      metadata: { reason: 'Password Reset' } as Prisma.InputJsonValue,
    });

    this.logger.log(`✅ Mot de passe réinitialisé : ${email}`);
    return { message: 'Mot de passe modifié avec succès.' };
  }

  // =====================================
  // 🔧 UTILITAIRES
  // =====================================

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePasswords(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email),
      this.generateRefreshToken(userId, email),
    ]);
    return { accessToken, refreshToken };
  }

  private async generateAccessToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload: JwtPayloadData = { sub: userId, email, type: 'access' };

    const jwtOptions = {
      secret: this.configService.get<string>('jwt.secret', 'default-secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn', '15m'),
    } as SignOptions;

    return this.jwtService.signAsync<JwtPayloadData>(payload, jwtOptions);
  }

  private async generateRefreshToken(
    userId: string,
    email: string,
    ip?: string,
    userAgent?: string,
  ): Promise<string> {
    const jti = randomUUID();

    const payload: JwtPayloadData = {
      sub: userId,
      email,
      type: 'refresh',
      jti,
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: '7d',
    });

    const redis = this.redisService.getClient();

    await redis.set(
      `refresh:${userId}:${jti}`,
      JSON.stringify({ ip, userAgent }),
      'EX',
      7 * 24 * 60 * 60,
    );

    return token;
  }

  // ✅ MÉTHODE AJOUTÉE (Manquait dans votre snippet)
  private async createAuditLog(data: CreateAuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data });
    } catch (error) {
      // ✅ FIX SÉCURITÉ : Vérification 'instanceof Error'
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur audit log : ${message}`);
    }
  }
}
