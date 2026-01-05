import { Test, TestingModule } from '@nestjs/testing';
import { AdviceController } from './advice.controller';

describe('AdviceController', () => {
  let controller: AdviceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdviceController],
    }).compile();

    controller = module.get<AdviceController>(AdviceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
