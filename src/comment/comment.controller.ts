/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto, QueryCommentDto } from './dto';
import { CommentEntity } from './entities';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ContentType } from '@prisma/client';

@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // =====================================
  // 💬 CRÉER UN COMMENTAIRE (Protégé)
  // =====================================
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un commentaire' })
  @ApiResponse({ status: 201, type: CommentEntity })
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.commentService.create(createCommentDto, userId);
  }

  // =====================================
  // 📋 LISTE DE COMMENTAIRES (Public)
  // =====================================
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lister les commentaires' })
  @ApiResponse({
    status: 200,
    schema: { example: { data: [new CommentEntity({})], meta: {} } },
  })
  async findAll(@Query() query: QueryCommentDto) {
    return this.commentService.findAll(query);
  }

  // =====================================
  // 🔍 DÉTAILS D'UN COMMENTAIRE (Public)
  // =====================================
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Détails d'un commentaire" })
  @ApiParam({ name: 'id', description: 'ID du commentaire' })
  @ApiResponse({ status: 200, type: CommentEntity })
  async findOne(@Param('id') id: string) {
    return this.commentService.findOne(id);
  }

  // =====================================
  // 💬 COMMENTAIRES POUR UN CONTENU (Public)
  // =====================================
  @Public()
  @Get('content/:contentType/:contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Commentaires pour un contenu' })
  @ApiParam({
    name: 'contentType',
    description: 'Type de contenu',
    enum: ContentType,
  })
  @ApiParam({ name: 'contentId', description: 'ID du contenu' })
  @ApiResponse({
    status: 200,
    schema: { example: { data: [new CommentEntity({})], meta: {} } },
  })
  async findByContent(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
    @Query() query: QueryCommentDto,
  ) {
    return this.commentService.findByContent(
      contentType as ContentType,
      contentId,
      query,
    );
  }

  // =====================================
  // ✏️ METTRE À JOUR (Protégé)
  // =====================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour un commentaire' })
  @ApiParam({ name: 'id', description: 'ID du commentaire' })
  @ApiResponse({ status: 200, type: CommentEntity })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.commentService.update(id, updateCommentDto, userId);
  }

  // =====================================
  // 🗑️ SUPPRIMER (Protégé)
  // =====================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un commentaire' })
  @ApiParam({ name: 'id', description: 'ID du commentaire' })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Commentaire supprimé avec succès' } },
  })
  async remove(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.commentService.remove(id, userId);
  }
}
