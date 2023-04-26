import { Test, TestingModule } from '@nestjs/testing';
import { NpcMovementService } from './npc-movement.service';

describe('NpcMovementService', () => {
  let service: NpcMovementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NpcMovementService],
    }).compile();

    service = module.get<NpcMovementService>(NpcMovementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
