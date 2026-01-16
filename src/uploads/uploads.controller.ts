/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/uploads/uploads.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Body,
  DefaultValuePipe,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { MediaEntity } from './entities/media.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { ContentType, UserType } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { MultiAuthGuard } from '../common/guards/multi-auth.guard';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(MultiAuthGuard)
@ApiBearerAuth('access-token')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // =====================================
  // 🖼️ UPLOAD IMAGE
  // =====================================
  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
    @CurrentUser() user: any,
  ) {
    console.log('--- DEBUG UPLOAD ---');
    console.log('File Object:', file);
    console.log('Body Object:', uploadImageDto);

    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const uploaderType = user.firstName ? UserType.USER : UserType.ORGANIZATION;

    return this.uploadsService.uploadImage(
      file,
      uploadImageDto,
      user.id,
      uploaderType,
    );
  }

  // =====================================
  // 📄 UPLOAD DOCUMENT
  // =====================================
  @Post('document')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload un document' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @CurrentUser() user: any,
  ): Promise<MediaEntity> {
    const uploaderType = user.firstName ? 'USER' : 'ORGANIZATION';
    return this.uploadsService.uploadDocument(
      file,
      uploadDocumentDto,
      user.id,
      uploaderType as any,
    );
  }

  // =====================================
  // 📋 MES UPLOADS
  // =====================================
  @Get('my')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mes fichiers uploadés' })
  async getMyUploads(
    @CurrentUser('id') uploaderId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('contentType') contentType?: ContentType,
  ) {
    return this.uploadsService.findMyUploads(
      uploaderId,
      page,
      limit,
      contentType,
    );
  }

  // =====================================
  // 🔍 DÉTAILS D'UN MÉDIA (PUBLIC)
  // =====================================
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Détails d'un média (Public)" })
  @ApiParam({ name: 'id', description: 'UUID du média' })
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<MediaEntity> {
    return this.uploadsService.findOne(id);
  }

  // =====================================
  // 🗑️ SUPPRIMER UN MÉDIA
  // =====================================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un média' })
  @ApiParam({ name: 'id', description: 'UUID du média à supprimer' })
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') uploaderId: string,
  ) {
    return this.uploadsService.remove(id, uploaderId);
  }
} // ✅ SEULE CETTE ACCOLADE DOIT FERMER LA CLASSE
