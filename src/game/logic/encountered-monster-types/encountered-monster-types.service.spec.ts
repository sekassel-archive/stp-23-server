import { Test, TestingModule } from '@nestjs/testing';
import { EncounteredMonsterTypesService } from './encountered-monster-types.service';

describe('EncounteredMonsterTypesService', () => {
  let service: EncounteredMonsterTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncounteredMonsterTypesService],
    }).compile();

    service = module.get<EncounteredMonsterTypesService>(EncounteredMonsterTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
