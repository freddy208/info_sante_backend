/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/auth/auth.service.ts

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
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtPayloadData } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // =====================================
  // 📝 INSCRIPTION
  // =====================================

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, phone, firstName, lastName, city, region } =
      registerDto;

    // Vérification email
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
          'Un compte supprimé existe avec cet email. Veuillez contacter le support.',
        );
      }
    }

    // Vérification téléphone
    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
        select: { id: true, status: true },
      });

      if (existingPhone && existingPhone.status !== UserStatus.DELETED) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    // Hashage mot de passe
    const hashedPassword = await this.hashPassword(password);

    // Création utilisateur
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

      // Génération tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Audit log
      await this.createAuditLog({
        actorType: 'USER',
        actorId: user.id,
        action: 'CREATE',
        resourceType: 'USER',
        resourceId: user.id,
        metadata: { email: user.email, registrationSource: 'WEB' },
      });

      this.logger.log(`✅ Nouvel utilisateur inscrit : ${user.email}`);

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
          city: user.city || null,
          region: user.region || null,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Erreur inscription : ${error.message}`);
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

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifications statut
    if (user.status === UserStatus.DELETED || user.deletedAt) {
      this.logger.warn(`🚫 Tentative connexion compte supprimé : ${email}`);
      throw new ForbiddenException(
        'Ce compte a été supprimé. Contactez le support.',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      this.logger.warn(`🚫 Tentative connexion compte suspendu : ${email}`);
      throw new ForbiddenException('Votre compte a été suspendu.');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Compte inactif. Vérifiez votre email.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Impossible de se connecter.');
    }

    // Vérification mot de passe
    const isPasswordValid = await this.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      await this.createAuditLog({
        actorType: 'USER',
        actorId: user.id,
        action: 'LOGIN',
        resourceType: 'USER',
        resourceId: user.id,
        status: 'FAILURE',
        metadata: { reason: 'Invalid password', ipAddress },
      });

      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Génération tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Mise à jour dernière connexion
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });

    // Audit log succès
    await this.createAuditLog({
      actorType: 'USER',
      actorId: user.id,
      action: 'LOGIN',
      resourceType: 'USER',
      resourceId: user.id,
      status: 'SUCCESS',
      metadata: { ipAddress },
    });

    this.logger.log(`✅ Connexion réussie : ${user.email}`);

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
        city: user.city || null,
        region: user.region || null,
      },
    };
  }

  // =====================================
  // 🔄 REFRESH TOKEN
  // =====================================

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    if (user.status === UserStatus.DELETED || user.deletedAt) {
      this.logger.warn(
        `🚫 Tentative refresh sur compte supprimé : ${user.email}`,
      );
      throw new ForbiddenException(
        'Ce compte a été supprimé. Veuillez contacter le support.',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      this.logger.warn(
        `🚫 Tentative refresh sur compte suspendu : ${user.email}`,
      );
      throw new ForbiddenException(
        'Votre compte a été suspendu. Veuillez contacter le support.',
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException(
        'Votre compte est inactif. Veuillez vérifier votre email.',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Impossible de renouveler le token');
    }

    const accessToken = await this.generateAccessToken(user.id, user.email);

    await this.createAuditLog({
      actorType: 'USER',
      actorId: user.id,
      action: 'LOGIN',
      resourceType: 'USER',
      resourceId: user.id,
      status: 'SUCCESS',
      metadata: {
        action: 'token_refresh',
        method: 'refresh_token',
      },
    });

    this.logger.log(`✅ Token renouvelé pour : ${user.email}`);

    return { accessToken };
  }

  // =====================================
  // 🔧 MÉTHODES UTILITAIRES
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
    const payload: JwtPayloadData = {
      sub: userId,
      email,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') as any, // allow string values like '15m'
    });
  }

  private async generateRefreshToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload: JwtPayloadData = {
      sub: userId,
      email,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') as any, // allow string values like '7d'
    });
  }

  private async createAuditLog(data: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data });
    } catch (error) {
      this.logger.error(`Erreur audit log : ${error.message}`);
    }
  }
}
