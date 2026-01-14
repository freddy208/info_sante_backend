/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { CreateBookmarkDto, QueryBookmarkDto } from './dto';
import { BookmarkEntity } from './entities';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContentType } from '@prisma/client';

/**
 * 🔖 BOOKMARKS CONTROLLER
 */
@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  // =====================================
  // 🔖 AJOUTER UN FAVORI (Protégé)
  // =====================================
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajouter un contenu aux favoris' })
  @ApiResponse({ status: 201, type: BookmarkEntity })
  @ApiResponse({
    status: 400,
    description: 'Contenu déjà en favori ou invalide',
  })
  async create(
    @Body() createBookmarkDto: CreateBookmarkDto,
    // ✅ CORRECTION : On capture tout l'objet user (pas juste 'sub')
    @CurrentUser() user: any,
  ) {
    // ✅ CORRECTION : On essaie de récupérer l'ID depuis l'entité (.id) ou le payload (.sub)
    // Cela gère le cas où votre stratégie renvoie l'entité User ou le payload JWT
    const userId = user?.id || user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        "Impossible de déterminer l'utilisateur connecté",
      );
    }

    return this.bookmarkService.create(createBookmarkDto, userId);
  }

  // =====================================
  // 📋 LISTE DES FAVORIS (Protégé)
  // =====================================
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Lister les favoris de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Liste des favoris' })
  async findAll(
    @Query() query: QueryBookmarkDto,
    @CurrentUser() user: any, // ✅ CORRECTION
  ) {
    const userId = user?.id || user?.sub;
    if (!userId) throw new UnauthorizedException('Utilisateur non trouvé');
    return this.bookmarkService.findAll(userId, query);
  }

  // =====================================
  // 🔍 VÉRIFIER SI UN CONTENU EST EN FAVORI (Protégé)
  // =====================================
  @Get('check/:contentType/:contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier si un contenu est en favori' })
  async isBookmarked(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: any, // ✅ CORRECTION
  ) {
    const userId = user?.id || user?.sub;
    if (!userId) throw new UnauthorizedException('Utilisateur non trouvé');
    return this.bookmarkService.isBookmarked(
      userId,
      contentType as ContentType,
      contentId,
    );
  }

  // =====================================
  // 📊 STATISTIQUES DES FAVORIS (Protégé)
  // =====================================
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Statistiques des favoris' })
  async getBookmarkStats(@CurrentUser() user: any) {
    // ✅ CORRECTION
    const userId = user?.id || user?.sub;
    if (!userId) throw new UnauthorizedException('Utilisateur non trouvé');
    return this.bookmarkService.getBookmarkStats(userId);
  }

  // =====================================
  // 🗑️ SUPPRIMER UN FAVORI (Protégé)
  // =====================================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un favori' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any, // ✅ CORRECTION
  ) {
    const userId = user?.id || user?.sub;
    if (!userId) throw new UnauthorizedException('Utilisateur non trouvé');
    return this.bookmarkService.remove(id, userId);
  }

  // =====================================
  // 🗑️ SUPPRIMER UN FAVORI PAR CONTENU (Protégé)
  // =====================================
  @Delete('content/:contentType/:contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un favori par contenu' })
  async removeByContent(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: any, // ✅ CORRECTION
  ) {
    const userId = user?.id || user?.sub;
    if (!userId) throw new UnauthorizedException('Utilisateur non trouvé');
    return this.bookmarkService.removeByContent(
      userId,
      contentType as ContentType,
      contentId,
    );
  }

  // =====================================
  // 🚀 OPTIMISATION : ROUTE CHECK LOT
  // =====================================
  @Post('check-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier plusieurs favoris en une requête' })
  async checkMany(
    @Body() body: { contentType: string; contentIds: string[] },
    @CurrentUser() user: any, // ✅ CORRECTION
  ): Promise<Record<string, boolean>> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new UnauthorizedException('Utilisateur non trouvé');
    return this.bookmarkService.checkMany(userId, body.contentIds);
  }
}
