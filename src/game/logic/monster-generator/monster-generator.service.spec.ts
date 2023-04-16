import { Test, TestingModule } from '@nestjs/testing';
import { MonsterGeneratorService } from './monster-generator.service';

describe('MonsterGeneratorService', () => {
  let service: MonsterGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonsterGeneratorService],
    }).compile();

    service = module.get<MonsterGeneratorService>(MonsterGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
