import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { AnnouncementRegistrationService } from './announcement-registration.service';
import {
  RegisterDto,
  RegisterVisitorDto,
  UpdateRegistrationDto,
  CancelRegistrationDto,
} from './dto';
import { RegistrationEntity } from './entities';
import { RegistrationStats } from './interfaces';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtOrganizationAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Announcement Registrations')
@Controller('announcement-registrations')
export class AnnouncementRegistrationController {
  constructor(
    private readonly registrationService: AnnouncementRegistrationService,
  ) {}

  // =====================================
  // 📝 INSCRIRE UN UTILISATEUR (Protégé)
  // =====================================
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrire un utilisateur connecté à une annonce' })
  @ApiResponse({ status: 201, type: RegistrationEntity })
  async register(
    @Body() registerDto: RegisterDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.registrationService.register(registerDto, userId);
  }

  // =====================================
  // 🌍 INSCRIRE UN VISITEUR (Public)
  // =====================================
  @Post('visitor')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscrire un visiteur (non connecté) à une annonce',
  })
  @ApiResponse({ status: 201, type: RegistrationEntity })
  async registerVisitor(@Body() registerVisitorDto: RegisterVisitorDto) {
    return this.registrationService.registerVisitor(registerVisitorDto);
  }

  // =====================================
  // 👤 MES INSCRIPTIONS (Protégé)
  // =====================================
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lister mes inscriptions' })
  @ApiResponse({ status: 200, type: [RegistrationEntity] })
  async findMyRegistrations(@CurrentUser('sub') userId: string) {
    return this.registrationService.findMyRegistrations(userId);
  }

  // =====================================
  // 📋 INSCRIPTIONS POUR UNE ANNONCE (Protégé Organisation)
  // =====================================
  @Get('announcement/:announcementId')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lister les inscriptions pour une de mes annonces' })
  @ApiParam({ name: 'announcementId', description: "ID de l'annonce" })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        data: [new RegistrationEntity({})],
        stats: new RegistrationStats(),
      },
    },
  })
  async findByAnnouncement(
    @Param('announcementId') announcementId: string,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.registrationService.findByAnnouncement(
      announcementId,
      organizationId,
    );
  }

  // =====================================
  // ✏️ METTRE À JOUR UNE INSCRIPTION (Protégé Organisation)
  // =====================================
  @Patch(':id')
  @UseGuards(JwtOrganizationAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmer ou mettre à jour une inscription' })
  @ApiParam({ name: 'id', description: "ID de l'inscription" })
  @ApiResponse({ status: 200, type: RegistrationEntity })
  async updateRegistration(
    @Param('id') id: string,
    @Body() updateRegistrationDto: UpdateRegistrationDto,
    @CurrentUser('sub') organizationId: string,
  ) {
    return this.registrationService.updateRegistration(
      id,
      updateRegistrationDto,
      organizationId,
    );
  }

  // =====================================
  // ❌ ANNULER UNE INSCRIPTION (Protégé Utilisateur)
  // =====================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler son inscription à une annonce' })
  @ApiParam({ name: 'id', description: "ID de l'inscription" })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Inscription annulée avec succès' } },
  })
  async cancelRegistration(
    @Param('id') id: string,
    @Body() cancelRegistrationDto: CancelRegistrationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.registrationService.cancelRegistration(
      id,
      cancelRegistrationDto,
      userId,
    );
  }
}
