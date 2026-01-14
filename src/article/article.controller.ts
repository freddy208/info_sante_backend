/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
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

  @Post()
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un article (brouillon)' })
  @ApiResponse({ status: 201, type: ArticleEntity })
  async create(
    @Body() dto: CreateArticleDto,
    @CurrentUser('sub') orgId: string,
  ) {
    return this.articleService.create(dto, orgId);
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryArticleDto) {
    return this.articleService.findAll(query);
  }

  @Get('my')
  @UseGuards(JwtOrganizationAuthGuard)
  async findMy(
    @Query() query: QueryArticleDto,
    @CurrentUser('sub') orgId: string,
  ) {
    return this.articleService.findMyArticles(orgId, query);
  }

  @Public()
  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.articleService.findOne(idOrSlug);
  }

  @Public()
  @Patch(':idOrSlug/view')
  async incrementView(@Param('idOrSlug') idOrSlug: string) {
    return this.articleService.viewArticle(idOrSlug);
  }

  @Patch(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser('sub') orgId: string,
  ) {
    return this.articleService.update(id, dto, orgId);
  }

  @Patch(':id/publish')
  @UseGuards(JwtOrganizationAuthGuard)
  async publish(@Param('id') id: string, @CurrentUser('sub') orgId: string) {
    return this.articleService.publish(id, orgId);
  }

  @Patch(':id/feature')
  @UseGuards(JwtOrganizationAuthGuard)
  async feature(
    @Param('id') id: string,
    @Body('isFeatured') isFeatured: boolean,
    @CurrentUser('sub') orgId: string,
  ) {
    return this.articleService.feature(id, orgId, isFeatured);
  }

  @Delete(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser('sub') orgId: string) {
    return this.articleService.remove(id, orgId);
  }
}
