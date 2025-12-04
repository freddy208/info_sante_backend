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
import { ArticleService } from './article.service';
import { CreateArticleDto, UpdateArticleDto, QueryArticleDto } from './dto';
import { ArticleEntity } from './entities';
import { JwtOrganizationAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Articles')
@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  // =====================================
  // 📝 CRÉER UN ARTICLE (Protégé)
  // =====================================
  @Post()
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un article (brouillon)' })
  @ApiResponse({ status: 201, type: ArticleEntity })
  async create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.articleService.create(createArticleDto, organizationId);
  }

  // =====================================
  // 📋 LISTE PUBLIQUE
  // =====================================
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lister les articles publiés' })
  @ApiResponse({
    status: 200,
    schema: { example: { data: [new ArticleEntity({})], meta: {} } },
  })
  async findAll(@Query() query: QueryArticleDto) {
    return this.articleService.findAll(query);
  }

  // =====================================
  // 👤 MES ARTICLES (Protégé)
  // =====================================
  @Get('my')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lister mes articles (tous statuts)' })
  async findMy(
    @Query() query: QueryArticleDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.articleService.findMyArticles(organizationId, query);
  }

  // =====================================
  // 🔍 DÉTAILS D'UN ARTICLE (Public)
  // =====================================
  @Public()
  @Get(':idOrSlug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Détails d'un article" })
  @ApiParam({ name: 'idOrSlug', description: "ID ou slug de l'article" })
  @ApiResponse({ status: 200, type: ArticleEntity })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.articleService.findOne(idOrSlug);
  }

  // =====================================
  // ✏️ METTRE À JOUR (Protégé)
  // =====================================
  @Patch(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour un article (brouillon)' })
  @ApiParam({ name: 'id', description: "ID de l'article" })
  @ApiResponse({ status: 200, type: ArticleEntity })
  async update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.articleService.update(id, updateArticleDto, organizationId);
  }

  // =====================================
  // 📢 PUBLIER (Protégé)
  // =====================================
  @Patch(':id/publish')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier un article' })
  @ApiParam({ name: 'id', description: "ID de l'article" })
  @ApiResponse({ status: 200, type: ArticleEntity })
  async publish(
    @Param('id') id: string,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.articleService.publish(id, organizationId);
  }

  // =====================================
  // ⭐ METTRE EN AVANT (Protégé)
  // =====================================
  @Patch(':id/feature')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mettre en avant ou retirer de l'avant un article" })
  @ApiParam({ name: 'id', description: "ID de l'article" })
  @ApiResponse({ status: 200, type: ArticleEntity })
  async feature(
    @Param('id') id: string,
    @Body('isFeatured') isFeatured: boolean,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.articleService.feature(id, organizationId, isFeatured);
  }

  // =====================================
  // 🗑️ SUPPRIMER (Protégé)
  // =====================================
  @Delete(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un article' })
  @ApiParam({ name: 'id', description: "ID de l'article" })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Article supprimé avec succès' } },
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.articleService.remove(id, organizationId);
  }
}
