/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdviceService, ViewAdviceResponseDto } from './advice.service';
import { CreateAdviceDto, UpdateAdviceDto, QueryAdviceDto } from './dto';
import { AdviceEntity } from './entities';
import { Priority } from '@prisma/client';
import { JwtOrganizationAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Advices')
@Controller('advices')
export class AdviceController {
  constructor(private readonly adviceService: AdviceService) {}

  @Get('stats')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  async getStats(@CurrentUser('sub') organizationId?: string) {
    return this.adviceService.getAdviceStats(organizationId);
  }

  @Post()
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  async create(
    @Body() dto: CreateAdviceDto,
    @CurrentUser('sub') orgId: string,
  ) {
    return this.adviceService.create(dto, orgId);
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryAdviceDto) {
    return this.adviceService.findAll(query);
  }

  @Get('my')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  async findMy(
    @Query() query: QueryAdviceDto,
    @CurrentUser('sub') orgId: string,
  ) {
    return this.adviceService.findMyAdvices(orgId, query);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adviceService.findOne(id);
  }

  @Public()
  @Patch(':id/view')
  async incrementView(@Param('id') id: string): Promise<ViewAdviceResponseDto> {
    return this.adviceService.viewAdvice(id);
  }

  @Patch(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdviceDto,
    @CurrentUser('sub') orgId: string,
  ) {
    return this.adviceService.update(id, dto, orgId);
  }

  @Patch(':id/publish')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  async publish(@Param('id') id: string, @CurrentUser('sub') orgId: string) {
    return this.adviceService.publish(id, orgId);
  }

  @Patch(':id/archive')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  async archive(@Param('id') id: string, @CurrentUser('sub') orgId: string) {
    return this.adviceService.archive(id, orgId);
  }

  @Patch(':id/priority')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  async updatePriority(
    @Param('id') id: string,
    @Body('priority') priority: Priority,
    @CurrentUser('sub') orgId: string,
  ) {
    return this.adviceService.updatePriority(id, orgId, priority);
  }

  @Delete(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  async remove(@Param('id') id: string, @CurrentUser('sub') orgId: string) {
    return this.adviceService.remove(id, orgId);
  }
}
