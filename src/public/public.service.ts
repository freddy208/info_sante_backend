/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager_1 from 'cache-manager';
import { PrismaService } from 'prisma/prisma.service';
import { NearbyQueryDto, SearchQueryDto } from './dto/public-query.dto';
import { PublicOrganizationEntity } from './entities/public-organization.entity';
import { PublicAlertEntity } from './entities/public-alert.entity';
import {
  PublicAlertLevel,
  PublicAlertType,
} from './entities/public-alert.entity';

import {
  Prisma,
  Priority,
  AnnouncementStatus,
  OrganizationStatus,
} from '@prisma/client';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: cacheManager_1.Cache,
  ) {}

  // ==========================================
  // UTILITAIRE : NORMALISATION TEXTE
  // ==========================================
  private normalizeText(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ==========================================
  // 1. ALERTES SANITAIRES (CACHE 5min)
  // ==========================================
  async getAlerts(): Promise<PublicAlertEntity[]> {
    const cacheKey = 'v1:public:alerts';
    const cached = await this.cacheManager.get<PublicAlertEntity[]>(cacheKey);
    if (cached) return cached;

    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        priority: { in: [Priority.HIGH, Priority.URGENT] },
        targetAudience: { has: 'ALL' },
      },
      include: { organization: { select: { name: true } }, location: true },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    const result = announcements.map((a) => {
      const level =
        a.priority === Priority.URGENT
          ? PublicAlertLevel.CRITICAL
          : PublicAlertLevel.WARNING;

      return new PublicAlertEntity({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt ?? `${a.content.substring(0, 100)}...`,
        level, // maintenant type-safe
        location: a.location?.city || a.organization?.name || 'National',
        date: this.formatDate(a.createdAt),
        type: PublicAlertType.ANNOUNCEMENT, // aussi enum
        slug: a.slug ?? undefined,
      });
    });

    await this.cacheManager.set(cacheKey, result, 300); // 5 min
    return result;
  }

  // ==========================================
  // 2. STRUCTURES DE SANTÉ À PROXIMITÉ (CACHE GEO 5min)
  // ==========================================
  async getNearbyOrganizations(
    dto: NearbyQueryDto,
  ): Promise<PublicOrganizationEntity[]> {
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);
    const radius = Number(dto.radius ?? 20);
    const limit = Number(dto.limit ?? 50);
    const typesKey = dto.types?.sort().join(',') ?? 'all';
    const cacheKey = `v1:geo:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}:${typesKey}:${limit}`;

    const ORGANIZATION_TYPE_MAP: Record<string, string> = {
      HOSPITAL_PUBLIC: 'HOSPITAL_PUBLIC',
      HOSPITAL_PRIVATE: 'HOSPITAL_PRIVATE',
      CLINIC: 'CLINIC',
      HEALTH_CENTER: 'HEALTH_CENTER',
      DISPENSARY: 'DISPENSARY',
      NGO: 'NGO',
    };

    const cached =
      await this.cacheManager.get<PublicOrganizationEntity[]>(cacheKey);
    if (cached) return cached;

    // ✅ PostGIS + tsvector ready
    const dbTypes =
      dto.types?.map((t) => ORGANIZATION_TYPE_MAP[t]).filter(Boolean) ?? [];

    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT
    id, name, type, phone, address, city, region, latitude, longitude,
    ST_DistanceSphere(
      ST_MakePoint(longitude::double precision, latitude::double precision),
      ST_MakePoint(${lng}::double precision, ${lat}::double precision)
    ) / 1000 AS distance
  FROM organizations
  WHERE status = 'ACTIVE'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
${
  dbTypes.length
    ? Prisma.sql`
        AND type = ANY(
          ARRAY[${Prisma.join(dbTypes.map(t => Prisma.sql`${t}::"OrganizationType"`))}]
        )
      `
    : Prisma.empty
}

    AND ST_DWithin(
      ST_MakePoint(longitude::double precision, latitude::double precision)::geography,
      ST_MakePoint(${lng}::double precision, ${lat}::double precision)::geography,
      ${radius * 1000}
    )
  ORDER BY distance
  LIMIT ${limit};
`);

    const result = rows.map(
      (r) =>
        new PublicOrganizationEntity({
          ...r,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          distance: Number(r.distance),
        }),
    );

    await this.cacheManager.set(cacheKey, result, 300); // 5 min
    return result;
  }

  // ==========================================
  // 3. RECHERCHE FULL-TEXT (TSVECTOR + CACHE)
  // ==========================================
  async search(dto: SearchQueryDto) {
    const query = dto.q.trim();
    if (!query) return { data: [], suggestions: [] };

    const cacheKey = `v1:search:${query.toLowerCase()}:${dto.limit}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const limit = Number(dto.limit ?? 10);
    const tsQuery = this.normalizeText(query);

    const [orgs, announcements, articles] = await Promise.all([
      this.prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id, name, type, phone, address, city, region, latitude, longitude
        FROM organizations
        WHERE status = 'ACTIVE'
          AND search_vector @@ plainto_tsquery('french', unaccent(${tsQuery}))
        ORDER BY ts_rank_cd(search_vector, plainto_tsquery('french', unaccent(${tsQuery}))) DESC
        LIMIT ${limit};
      `),

      this.prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id, title, excerpt, slug, "publishedAt", status
        FROM announcements
        WHERE status = 'PUBLISHED'
          AND search_vector @@ plainto_tsquery('french', unaccent(${tsQuery}))
        ORDER BY ts_rank_cd(search_vector, plainto_tsquery('french', unaccent(${tsQuery}))) DESC
        LIMIT ${limit};
      `),

      this.prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id, title, excerpt, slug, "publishedAt", status
        FROM articles
        WHERE status = 'PUBLISHED'
          AND search_vector @@ plainto_tsquery('french', unaccent(${tsQuery}))
        ORDER BY ts_rank_cd(search_vector, plainto_tsquery('french', unaccent(${tsQuery}))) DESC
        LIMIT ${limit};
      `),
    ]);

    const data = [
      ...orgs.map((o) => ({
        ...o,
        type: 'ORGANIZATION',
        relevance: 1,
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
      })),
      ...announcements.map((a) => ({
        ...a,
        type: 'ANNOUNCEMENT',
        relevance: 2,
      })),
      ...articles.map((a) => ({ ...a, type: 'ARTICLE', relevance: 3 })),
    ].slice(0, limit);

    const result = {
      status: 'success',
      data,
      suggestions:
        data.length === 0
          ? [
              'Choléra',
              'Paludisme',
              'Vaccination',
              'Hôpital Central',
              'Urgences',
            ]
          : [],
    };

    await this.cacheManager.set(cacheKey, result, 60); // 1 min
    return result;
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================
  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private formatDate(date: Date): string {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 3600) return "Il y a moins d'une heure";
    if (diff < 86400) return "Aujourd'hui";
    if (diff < 172800) return 'Hier';
    return date.toLocaleDateString('fr-FR');
  }
}
