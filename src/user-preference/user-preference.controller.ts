/* eslint-disable prettier/prettier */
// user-preference.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPreferenceService } from './user-preference.service';
import { CreateUserPreferenceDto } from './dto/create-user-preference.dto';
import { UpdateUserPreferenceDto } from './dto/update-user-preference.dto';
import { JwtAuthGuard } from 'src/common/guards';

@ApiTags('User Preferences')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('user-preferences')
export class UserPreferenceController {
  constructor(
    private readonly userPreferenceService: UserPreferenceService,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mes préférences utilisateur' })
  async getMine(@CurrentUser('sub') userId: string) {
    return this.userPreferenceService.getMyPreferences(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer mes préférences' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateUserPreferenceDto,
  ) {
    return this.userPreferenceService.create(userId, dto);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour mes préférences' })
  async update(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateUserPreferenceDto,
  ) {
    return this.userPreferenceService.update(userId, dto);
  }
}
