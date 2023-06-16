import { Test, TestingModule } from '@nestjs/testing';
import { BattleSetupService } from './battle-setup.service';

describe('BattleSetupService', () => {
  let service: BattleSetupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BattleSetupService],
    }).compile();

    service = module.get<BattleSetupService>(BattleSetupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
