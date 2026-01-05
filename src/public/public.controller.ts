import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  ParseArrayPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { NearbyQueryDto, SearchQueryDto } from './dto/public-query.dto';
import { Public } from '../common/decorators/public.decorator'; // Utilise ton décorateur existant
import { Throttle } from '@nestjs/throttler';

@ApiTags('Public - Landing Page')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // ==========================================
  // GET /public/alerts
  // ==========================================
  @Public()
  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Liste des alertes sanitaires urgentes (Bannière d'accueil)",
  })
  @ApiResponse({ status: 200, type: [Object] }) // Type Array générique pour l'exemple
  async getAlerts() {
    return this.publicService.getAlerts();
  }

  // ==========================================
  // GET /public/organizations/nearby
  // ==========================================
  @Public()
  @Get('organizations/nearby')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trouver les structures de santé à proximité (Carte)',
  })
  @ApiResponse({ status: 200, type: [Object] })
  // ✅ CORRECTION : On sépare 'types' pour le transformer correctement en tableau
  async getNearby(
    @Query() query: Omit<NearbyQueryDto, 'types'>, // Récupère lat, lng, radius, limit
    @Query('types', new ParseArrayPipe({ optional: true })) types: string[], // Parse le tableau séparément
  ) {
    // On reconstruit l'objet complet attendu par le Service
    const fullQuery: NearbyQueryDto = { ...query, types };
    return this.publicService.getNearbyOrganizations(fullQuery);
  }

  // ==========================================
  // GET /public/search
  // ==========================================
  @Public()
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Recherche globale (Hôpitaux, Articles, Alertes) avec Fallback intelligent',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Mot clé' })

  // ✅ AJOUT SÉCURITÉ CRITIQUE : Rate Limiting
  // On limite à 10 requêtes par minute par IP pour éviter que des bots ne fassent craquer la DB
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async search(@Query() query: SearchQueryDto) {
    return this.publicService.search(query);
  }
}
