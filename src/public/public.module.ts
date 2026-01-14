import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    // Enregistre le module cache globalement ou pour ce module
    CacheModule.register({
      isGlobal: true, // Optionnel : permet d'utiliser @Inject(CACHE_MANAGER partout)
      ttl: 60, // TTL par défaut
    }),
    // PrismaModule,
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
