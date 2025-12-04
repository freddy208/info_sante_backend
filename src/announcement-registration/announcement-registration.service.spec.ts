import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementRegistrationService } from './announcement-registration.service';

describe('AnnouncementRegistrationService', () => {
  let service: AnnouncementRegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnnouncementRegistrationService],
    }).compile();

    service = module.get<AnnouncementRegistrationService>(AnnouncementRegistrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
