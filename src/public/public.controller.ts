/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  ParseArrayPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';
import {
  NearbyQueryDto,
  OrganizationType,
  SearchQueryDto,
} from './dto/public-query.dto';
import { Public } from '../common/decorators/public.decorator'; // Utilise ton décorateur existant
import { Throttle } from '@nestjs/throttler';

@ApiTags('Public - Landing Page')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // ==========================
  // ALERTES
  // ==========================
  @Public()
  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getAlerts() {
    return this.publicService.getAlerts();
  }

  // ==========================
  // ORGANISATIONS À PROXIMITÉ
  // ==========================
  @Public()
  @Get('organizations/nearby')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getNearby(
    @Query() query: Omit<NearbyQueryDto, 'types'>,
    @Query('types', new ParseArrayPipe({ optional: true })) types?: string[],
  ) {
    // Conversion string[] -> OrganizationType[]
    const enumTypes: OrganizationType[] | undefined = types
      ? types
          .map((t) => {
            if (
              Object.values(OrganizationType).includes(t as OrganizationType)
            ) {
              return t as OrganizationType;
            }
            return undefined;
          })
          .filter((t): t is OrganizationType => t !== undefined)
      : undefined;

    return this.publicService.getNearbyOrganizations({
      ...query,
      types: enumTypes,
    });
  }

  // ==========================
  // SEARCH GLOBAL
  // ==========================
  @Public()
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async search(@Query() query: SearchQueryDto) {
    return this.publicService.search(query);
  }
}
