/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { NearbyQueryDto, SearchQueryDto } from './dto/public-query.dto';
import { PublicOrganizationEntity } from './entities/public-organization.entity';
import { PublicAlertEntity } from './entities/public-alert.entity';
import {
  Priority,
  AnnouncementStatus,
  OrganizationStatus,
  ArticleStatus,
  Prisma,
  OrganizationType, // Importer l'enum pour la sécurité de type
} from '@prisma/client';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // UTILITAIRE : NORMALISATION
  // ==========================================
  private normalizeText(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ==========================================
  // 1. ALERTES (Inchangé)
  // ==========================================
  async getAlerts(): Promise<PublicAlertEntity[]> {
    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        priority: { in: [Priority.HIGH, Priority.URGENT] },
        targetAudience: { has: 'ALL' },
      },
      include: {
        organization: { select: { name: true } },
        location: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    return announcements.map((a) => {
      const level = a.priority === Priority.URGENT ? 'critical' : 'warning';
      return new PublicAlertEntity({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt || a.content.substring(0, 100) + '...',
        level: level,
        location: a.location?.city || a.organization?.name || 'National',
        date: this.formatDate(a.createdAt),
        type: 'ANNOUNCEMENT',
        slug: a.slug || undefined,
      });
    });
  }

  // ==========================================
  // 2. NEARBY (FIX PRISMA CRASH)
  // ==========================================
  async getNearbyOrganizations(
    dto: NearbyQueryDto,
  ): Promise<PublicOrganizationEntity[]> {
    // ✅ CORRECTION CRITIQUE : Force les types Number pour éviter les erreurs String de Prisma
    // Cela évite l'erreur : "invalid digit found in string. Expected decimal String."
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);
    const radius = Number(dto.radius || 20);
    const limit = Number(dto.limit || 50);
    const types = dto.types;

    const R = 6371;
    // Maintenant le calcul est mathématique correct (Nombre + Nombre), pas String + String
    const rLat = (radius / R) * (180 / Math.PI);
    const rLng = rLat / Math.cos((lat * Math.PI) / 180);

    const minLat = lat - rLat;
    const maxLat = lat + rLat;
    const minLng = lng - rLng;
    const maxLng = lng + rLng;

    const organizations = await this.prisma.organization.findMany({
      where: {
        status: OrganizationStatus.ACTIVE,
        latitude: { not: null, gte: minLat, lte: maxLat },
        longitude: { not: null, gte: minLng, lte: maxLng },

        // Gestion du filtre types
        ...(types && types.length > 0
          ? { type: { in: types as OrganizationType[] } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        phone: true,
        address: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
      },
    });

    const nearbyOrgs = organizations
      .map((org) => {
        const distance = this.calculateDistance(
          lat,
          lng,
          Number(org.latitude),
          Number(org.longitude),
        );
        return {
          ...org,
          latitude: Number(org.latitude),
          longitude: Number(org.longitude),
          distance,
        };
      })
      .filter((org) => org.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return nearbyOrgs.map((org) => new PublicOrganizationEntity(org));
  }

  // ==========================================
  // 3. RECHERCHE INTELLIGENTE (Inchangé)
  // ==========================================
  async search(dto: SearchQueryDto) {
    const { q, limit } = dto;
    const query = q.trim();

    const normalizedQuery = this.normalizeText(query);
    const pattern = `%${normalizedQuery}%`;

    if (!query) return { data: [], suggestions: [] };

    interface RawOrganization {
      id: string;
      name: string;
      type: string;
      phone: string;
      address: string;
      city: string;
      region: string;
      latitude: string;
      longitude: string;
    }

    interface RawContent {
      id: string;
      title: string;
      excerpt: string;
      slug: string;
      publishedAt: Date;
      status: string;
    }

    interface RawSuggestion {
      name: string;
    }

    const [orgs, announcements, articles] = await Promise.all([
      this.prisma.$queryRaw<RawOrganization[]>(
        Prisma.sql`SELECT id, name, type, phone, address, city, region, latitude, longitude
                     FROM organizations
                     WHERE status = 'ACTIVE'
                       AND (
                         LOWER(unaccent(name)) LIKE LOWER(unaccent(${pattern}))
                         OR LOWER(unaccent(city)) LIKE LOWER(unaccent(${pattern}))
                       )
                     LIMIT ${limit}`,
      ),

      this.prisma.$queryRaw<RawContent[]>(
        Prisma.sql`SELECT id, title, excerpt, slug, "publishedAt" as "publishedAt", status
                     FROM announcements
                     WHERE status = 'PUBLISHED'
                       AND (
                         LOWER(unaccent(title)) LIKE LOWER(unaccent(${pattern}))
                         OR LOWER(unaccent(content)) LIKE LOWER(unaccent(${pattern}))
                       )
                     LIMIT ${limit}`,
      ),

      this.prisma.$queryRaw<RawContent[]>(
        Prisma.sql`SELECT id, title, excerpt, slug, "publishedAt" as "publishedAt", status
                     FROM articles
                     WHERE status = 'PUBLISHED'
                       AND (
                         LOWER(unaccent(title)) LIKE LOWER(unaccent(${pattern}))
                         OR LOWER(unaccent(content)) LIKE LOWER(unaccent(${pattern}))
                       )
                     LIMIT ${limit}`,
      ),
    ]);

    const results = [
      ...orgs.map((o) => ({
        ...o,
        type: 'ORGANIZATION',
        relevance: 1,
        latitude: parseFloat(o.latitude),
        longitude: parseFloat(o.longitude),
      })),
      ...announcements.map((a) => ({
        ...a,
        type: 'ANNOUNCEMENT',
        relevance: 2,
      })),
      ...articles.map((a) => ({ ...a, type: 'ARTICLE', relevance: 3 })),
    ];

    if (results.length === 0) {
      this.logger.log(
        `Aucun résultat pour "${query}", déclenchement du fallback.`,
      );

      const [categories, specialties] = await Promise.all([
        this.prisma.$queryRaw<RawSuggestion[]>(
          Prisma.sql`SELECT name FROM categories
                       WHERE LOWER(unaccent(name)) LIKE LOWER(unaccent(${pattern}))
                       LIMIT 5`,
        ),

        this.prisma.$queryRaw<RawSuggestion[]>(
          Prisma.sql`SELECT name FROM specialties
                       WHERE LOWER(unaccent(name)) LIKE LOWER(unaccent(${pattern}))
                       LIMIT 5`,
        ),
      ]);

      let suggestions: string[] = [];

      if (categories.length > 0 || specialties.length > 0) {
        suggestions = [
          ...categories.map((c) => c.name),
          ...specialties.map((s) => s.name),
        ];
      } else {
        suggestions = [
          'Urgences',
          'Medecine Generale',
          'Pediatrie',
          'Pharmacie',
        ];
      }

      return {
        status: 'empty',
        data: [],
        suggestions: suggestions.slice(0, 5),
      };
    }

    return {
      status: 'success',
      data: results.slice(0, limit),
    };
  }

  // ==========================================
  // UTILS (Inchangé)
  // ==========================================
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
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 3600) return "Il y a moins d'une heure";
    if (diff < 86400) return "Aujourd'hui";
    if (diff < 172800) return 'Hier';
    return date.toLocaleDateString('fr-FR');
  }
}
