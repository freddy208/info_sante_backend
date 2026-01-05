/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/location/location.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeocodeDto } from './dto/geocode.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationEntity } from './entities/location.entity';
import { GeocodeResultEntity } from './entities/geocode-result.entity';
import {
  OpenCageResponse,
  OpenCageResult,
} from './interfaces/opencage-response.interface';
import axios from 'axios';
import { PrismaService } from 'prisma/prisma.service';

/**
 * 📍 LOCATION SERVICE
 *
 * Gère la géolocalisation via OpenCage et le stockage des localisations.
 *
 * FONCTIONNALITÉS :
 * - Geocoding (adresse → coordonnées)
 * - Reverse Geocoding (coordonnées → adresse)
 * - CRUD localisations en base de données
 * - Recherche de proximité
 */
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('geocoding.apiKey')!;
    this.apiUrl = this.configService.get<string>('geocoding.apiUrl')!;

    if (!this.apiKey) {
      this.logger.error('❌ OPENCAGE_API_KEY non configurée');
      throw new Error('Configuration OpenCage manquante');
    }
  }

  // =====================================
  // 🌍 GEOCODING (Adresse → Coordonnées)
  // =====================================

  /**
   * Convertir une adresse en coordonnées GPS
   *
   * @param geocodeDto - Adresse à géocoder
   */
  async geocode(geocodeDto: GeocodeDto): Promise<GeocodeResultEntity[]> {
    const { address } = geocodeDto;

    try {
      // 🌍 APPEL API OPENCAGE
      const response = await axios.get<OpenCageResponse>(
        `${this.apiUrl}/json`,
        {
          params: {
            q: address,
            key: this.apiKey,
            language: 'fr', // Résultats en français
            countrycode: 'cm', // ✅ Limiter au Cameroun
            limit: 5, // Maximum 5 résultats
          },
        },
      );

      if (response.data.status.code !== 200) {
        throw new HttpException(
          `Erreur OpenCage: ${response.data.status.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      if (response.data.total_results === 0) {
        throw new NotFoundException(
          'Aucune localisation trouvée pour cette adresse',
        );
      }

      // 📊 TRANSFORMER LES RÉSULTATS
      const results = response.data.results.map((result) =>
        this.transformOpenCageResult(result),
      );

      this.logger.log(
        `✅ Géocodage réussi : ${address} → ${results.length} résultat(s)`,
      );

      return results;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`❌ Erreur géocodage : ${error.message}`);

      if (error.response?.status === 402) {
        throw new HttpException(
          'Quota API OpenCage dépassé',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new BadRequestException("Erreur lors du géocodage de l'adresse");
    }
  }

  // =====================================
  // 🔄 REVERSE GEOCODING (Coordonnées → Adresse)
  // =====================================

  /**
   * Convertir des coordonnées GPS en adresse
   *
   * @param reverseGeocodeDto - Coordonnées à convertir
   */
  async reverseGeocode(
    reverseGeocodeDto: ReverseGeocodeDto,
  ): Promise<GeocodeResultEntity> {
    const { latitude, longitude } = reverseGeocodeDto;

    try {
      // 🔄 APPEL API OPENCAGE
      const response = await axios.get<OpenCageResponse>(
        `${this.apiUrl}/json`,
        {
          params: {
            q: `${latitude},${longitude}`,
            key: this.apiKey,
            language: 'fr',
            limit: 1,
          },
        },
      );

      if (response.data.status.code !== 200) {
        throw new HttpException(
          `Erreur OpenCage: ${response.data.status.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      if (response.data.total_results === 0) {
        throw new NotFoundException(
          'Aucune adresse trouvée pour ces coordonnées',
        );
      }

      const result = this.transformOpenCageResult(response.data.results[0]);

      this.logger.log(
        `✅ Géocodage inverse réussi : (${latitude}, ${longitude}) → ${result.formattedAddress}`,
      );

      return result;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`❌ Erreur géocodage inverse : ${error.message}`);
      throw new BadRequestException(
        'Erreur lors du géocodage inverse des coordonnées',
      );
    }
  }

  // =====================================
  // 📝 CRÉER UNE LOCALISATION
  // =====================================

  /**
   * Créer une localisation en base de données
   *
   * @param createLocationDto - Données de la localisation
   */
  async create(createLocationDto: CreateLocationDto): Promise<LocationEntity> {
    const {
      contentType,
      contentId,
      address,
      city,
      region,
      latitude,
      longitude,
      placeId,
      formattedAddress,
      additionalInfo,
    } = createLocationDto;

    // ✅ Vérifier qu'une localisation n'existe pas déjà pour ce contenu
    const existingLocation = await this.prisma.location.findUnique({
      where: { contentId },
    });

    if (existingLocation) {
      throw new BadRequestException(
        'Une localisation existe déjà pour ce contenu',
      );
    }

    try {
      const location = await this.prisma.location.create({
        data: {
          contentType,
          contentId,
          address,
          city,
          region,
          latitude,
          longitude,
          placeId,
          formattedAddress,
          additionalInfo,
        },
      });

      this.logger.log(
        `✅ Localisation créée : ${location.id} pour ${contentType} ${contentId}`,
      );

      return new LocationEntity(location as any);
    } catch (error: any) {
      this.logger.error(`❌ Erreur création localisation : ${error.message}`);
      throw new BadRequestException(
        'Erreur lors de la création de la localisation',
      );
    }
  }

  // =====================================
  // 🔍 RÉCUPÉRER UNE LOCALISATION
  // =====================================

  /**
   * Récupérer une localisation par contentId
   *
   * @param contentId - ID du contenu
   */
  async findByContentId(contentId: string): Promise<LocationEntity> {
    const location = await this.prisma.location.findUnique({
      where: { contentId },
    });

    if (!location) {
      throw new NotFoundException(
        `Localisation pour le contenu ${contentId} non trouvée`,
      );
    }

    return new LocationEntity(location as any);
  }

  // =====================================
  // ✏️ METTRE À JOUR UNE LOCALISATION
  // =====================================

  /**
   * Mettre à jour une localisation
   *
   * @param contentId - ID du contenu
   * @param updateLocationDto - Données à mettre à jour
   */
  async update(
    contentId: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<LocationEntity> {
    // ✅ Vérifier que la localisation existe
    await this.findByContentId(contentId);

    try {
      const updatedLocation = await this.prisma.location.update({
        where: { contentId },
        data: updateLocationDto,
      });

      this.logger.log(`✅ Localisation mise à jour : ${contentId}`);

      return new LocationEntity(updatedLocation as any);
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur mise à jour localisation : ${error.message}`,
      );
      throw new BadRequestException(
        'Erreur lors de la mise à jour de la localisation',
      );
    }
  }

  // =====================================
  // 🗑️ SUPPRIMER UNE LOCALISATION
  // =====================================

  /**
   * Supprimer une localisation
   *
   * @param contentId - ID du contenu
   */
  async remove(contentId: string): Promise<{ message: string }> {
    // ✅ Vérifier que la localisation existe
    await this.findByContentId(contentId);

    try {
      await this.prisma.location.delete({
        where: { contentId },
      });

      this.logger.log(`🗑️ Localisation supprimée : ${contentId}`);

      return {
        message: 'Localisation supprimée avec succès',
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur suppression localisation : ${error.message}`,
      );
      throw new BadRequestException(
        'Erreur lors de la suppression de la localisation',
      );
    }
  }

  // =====================================
  // 🔧 MÉTHODES UTILITAIRES PRIVÉES
  // =====================================

  /**
   * Transformer un résultat OpenCage en GeocodeResultEntity
   *
   * @param result - Résultat OpenCage
   */
  private transformOpenCageResult(result: OpenCageResult): GeocodeResultEntity {
    const { components } = result;

    return new GeocodeResultEntity({
      formattedAddress: result.formatted,
      latitude: result.geometry.lat,
      longitude: result.geometry.lng,
      city:
        components.city ||
        components.town ||
        components.village ||
        components.county ||
        undefined,
      region:
        components.state ||
        components.region ||
        components.state_district ||
        undefined,
      country: components.country,
      countryCode: components.country_code?.toUpperCase(),
      postcode: components.postcode,
      confidence: result.confidence,
      placeId: undefined, // OpenCage n'a pas de placeId standard
    });
  }
}
