import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementRegistrationController } from './announcement-registration.controller';

describe('AnnouncementRegistrationController', () => {
  let controller: AnnouncementRegistrationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementRegistrationController],
    }).compile();

    controller = module.get<AnnouncementRegistrationController>(AnnouncementRegistrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
