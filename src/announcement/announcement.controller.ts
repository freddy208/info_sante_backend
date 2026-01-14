import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AnnouncementService } from './announcement.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  QueryAnnouncementDto,
} from './dto';
import { AnnouncementEntity } from './entities';
import { JwtOrganizationAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RegisterAnnouncementDto } from './dto/register-announcement.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  // =====================================
  // 📝 CRÉER UNE ANNONCE (Protégé)
  // =====================================
  @Post()
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une annonce (brouillon)' })
  @ApiResponse({ status: 201, type: AnnouncementEntity })
  async create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.announcementService.create(
      createAnnouncementDto,
      organizationId,
    );
  }

  // =====================================
  // 📋 LISTE PUBLIQUE
  // =====================================
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60 } })
  @ApiOperation({ summary: 'Lister les annonces publiées' })
  @ApiResponse({
    status: 200,
    schema: { example: { data: [new AnnouncementEntity({})], meta: {} } },
  })
  async findAll(@Query() query: QueryAnnouncementDto) {
    return this.announcementService.findAll(query);
  }

  // =====================================
  // 👤 MES ANNONCES (Protégé)
  // =====================================
  @Get('my')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60 } })
  @ApiOperation({ summary: 'Lister mes annonces (tous statuts)' })
  async findMy(
    @Query() query: QueryAnnouncementDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.announcementService.findMyAnnouncements(organizationId, query);
  }

  // =====================================
  // 🔍 DÉTAILS D'UNE ANNONCE (Public)
  // =====================================
  @Public()
  @Get(':idOrSlug')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60 } })
  @ApiOperation({ summary: "Détails d'une annonce" })
  @ApiParam({ name: 'idOrSlug', description: "ID ou slug de l'annonce" })
  @ApiResponse({ status: 200, type: AnnouncementEntity })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.announcementService.findOne(idOrSlug);
  }

  // =====================================
  // ✏️ METTRE À JOUR (Protégé)
  // =====================================
  @Patch(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour une annonce' })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({ status: 200, type: AnnouncementEntity })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.announcementService.update(id, dto, organizationId);
  }

  // =====================================
  // 📢 PUBLIER (Protégé)
  // =====================================
  @Patch(':id/publish')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier une annonce' })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({ status: 200, type: AnnouncementEntity })
  async publish(
    @Param('id') id: string,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.announcementService.publish(id, organizationId);
  }

  // =====================================
  // 🗑️ SUPPRIMER (Protégé)
  // =====================================
  @Delete(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer une annonce' })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Annonce supprimée avec succès' } },
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.announcementService.remove(id, organizationId);
  }

  // =====================================
  // 📝 S'INSCRIRE (Public ou Auth)
  // =====================================
  @Post(':id/register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: "S'inscrire à une annonce" })
  async register(
    @Param('id') id: string,
    @Body() dto: RegisterAnnouncementDto,
    @CurrentUser('sub') userId: string | null,
  ) {
    return this.announcementService.register(id, userId, dto);
  }
}
