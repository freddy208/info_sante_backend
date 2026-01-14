// user-preference.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserPreferenceDto } from './dto/create-user-preference.dto';
import { UpdateUserPreferenceDto } from './dto/update-user-preference.dto';
import { UserPreferenceEntity } from './entities/user-preference.entity';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyPreferences(userId: string): Promise<UserPreferenceEntity> {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      throw new NotFoundException('Préférences non définies');
    }

    return new UserPreferenceEntity(pref);
  }

  async create(
    userId: string,
    dto: CreateUserPreferenceDto,
  ): Promise<UserPreferenceEntity> {
    const exists = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (exists) {
      throw new BadRequestException('Préférences déjà existantes');
    }

    const created = await this.prisma.userPreference.create({
      data: {
        userId,
        ...dto,
      },
    });

    return new UserPreferenceEntity(created);
  }

  async update(
    userId: string,
    dto: UpdateUserPreferenceDto,
  ): Promise<UserPreferenceEntity> {
    const exists = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!exists) {
      throw new NotFoundException('Préférences non définies');
    }

    const updated = await this.prisma.userPreference.update({
      where: { userId },
      data: dto,
    });

    return new UserPreferenceEntity(updated);
  }
}
