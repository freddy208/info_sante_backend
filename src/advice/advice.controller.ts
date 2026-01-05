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
import { AdviceService } from './advice.service';
import { CreateAdviceDto, UpdateAdviceDto, QueryAdviceDto } from './dto';
import { AdviceEntity } from './entities';
import { Priority } from '@prisma/client';
import { JwtOrganizationAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

/**
 * 💡 ADVICES CONTROLLER
 *
 * Gère toutes les routes liées aux conseils de santé.
 */
@ApiTags('Advices')
@Controller('advices')
export class AdviceController {
  constructor(private readonly adviceService: AdviceService) {}

  // =====================================
  // 📊 STATISTIQUES (Protégé)
  // ⚠️ IMPORTANT : Cette route doit être AVANT :id, sinon 'stats' est pris pour un ID
  // =====================================
  @Get('stats')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Statistiques des conseils' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        total: 45,
        published: 32,
        draft: 8,
        archived: 5,
        byPriority: {
          LOW: 10,
          MEDIUM: 25,
          HIGH: 8,
          URGENT: 2,
        },
        byAudience: {
          CHILDREN: 15,
          INFANTS: 8,
          ADULTS: 30,
          ELDERLY: 12,
          PREGNANT_WOMEN: 5,
          ALL: 25,
        },
        totalViews: 1250,
        totalReactions: 340,
        totalShares: 180,
      },
    },
  })
  async getStats(@CurrentUser('sub') organizationId?: string) {
    return this.adviceService.getAdviceStats(organizationId);
  }

  // =====================================
  // 💡 CRÉER UN CONSEIL (Protégé)
  // =====================================
  @Post()
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un conseil (brouillon)' })
  @ApiResponse({ status: 201, type: AdviceEntity })
  async create(
    @Body() createAdviceDto: CreateAdviceDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.adviceService.create(createAdviceDto, organizationId);
  }

  // =====================================
  // 📋 LISTE PUBLIQUE
  // =====================================
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lister les conseils publiés' })
  @ApiResponse({
    status: 200,
    schema: { example: { data: [new AdviceEntity({})], meta: {} } },
  })
  async findAll(@Query() query: QueryAdviceDto) {
    return this.adviceService.findAll(query);
  }

  // =====================================
  // 👤 MES CONSEILS (Protégé)
  // =====================================
  @Get('my')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lister mes conseils (tous statuts)' })
  async findMy(
    @Query() query: QueryAdviceDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.adviceService.findMyAdvices(organizationId, query);
  }

  // =====================================
  // 🔍 DÉTAILS D'UN CONSEIL (Public - GET)
  // =====================================
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Détails d'un conseil" })
  @ApiParam({ name: 'id', description: 'ID du conseil' })
  @ApiResponse({ status: 200, type: AdviceEntity })
  async findOne(@Param('id') id: string) {
    // ✅ BONNE PRATIQUE : Appelle findOne qui est maintenant une LECTURE PURE
    return this.adviceService.findOne(id);
  }

  // =====================================
  // 👁 INCRÉMENTER LES VUES (Public - PATCH)
  // =====================================
  // ✅ NOUVEAU : Route explicite pour l'incrémentation
  @Public()
  @Patch(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Incrémenter le nombre de vues' })
  @ApiParam({ name: 'id', description: 'ID du conseil' })
  @ApiResponse({ status: 200, type: AdviceEntity })
  async incrementView(@Param('id') id: string) {
    // ✅ BONNE PRATIQUE : Appelle la nouvelle méthode dédiée
    return this.adviceService.viewAdvice(id);
  }

  // =====================================
  // ✏️ METTRE À JOUR (Protégé)
  // =====================================
  @Patch(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour un conseil (brouillon)' })
  @ApiParam({ name: 'id', description: 'ID du conseil' })
  @ApiResponse({ status: 200, type: AdviceEntity })
  async update(
    @Param('id') id: string,
    @Body() updateAdviceDto: UpdateAdviceDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.adviceService.update(id, updateAdviceDto, organizationId);
  }

  // =====================================
  // 📢 PUBLIER (Protégé)
  // =====================================
  @Patch(':id/publish')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier un conseil' })
  @ApiParam({ name: 'id', description: 'ID du conseil' })
  @ApiResponse({ status: 200, type: AdviceEntity })
  async publish(
    @Param('id') id: string,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.adviceService.publish(id, organizationId);
  }

  // =====================================
  // 📊 ARCHIVER (Protégé)
  // =====================================
  @Patch(':id/archive')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver un conseil' })
  @ApiParam({ name: 'id', description: 'ID du conseil' })
  @ApiResponse({ status: 200, type: AdviceEntity })
  async archive(
    @Param('id') id: string,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.adviceService.archive(id, organizationId);
  }

  // =====================================
  // 🔄 CHANGER LA PRIORITÉ (Protégé)
  // =====================================
  @Patch(':id/priority')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Changer la priorité d'un conseil" })
  @ApiParam({ name: 'id', description: 'ID du conseil' })
  @ApiResponse({ status: 200, type: AdviceEntity })
  async updatePriority(
    @Param('id') id: string,
    @Body('priority') priority: Priority,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.adviceService.updatePriority(id, organizationId, priority);
  }

  // =====================================
  // 🗑️ SUPPRIMER (Protégé)
  // =====================================
  @Delete(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un conseil' })
  @ApiParam({ name: 'id', description: 'ID du conseil' })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Conseil supprimé avec succès' } },
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.adviceService.remove(id, organizationId);
  }
}
