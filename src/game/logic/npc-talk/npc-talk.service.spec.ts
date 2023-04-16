import { Test, TestingModule } from '@nestjs/testing';
import { NpcTalkService } from './npc-talk.service';

describe('NpcTalkService', () => {
  let service: NpcTalkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NpcTalkService],
    }).compile();

    service = module.get<NpcTalkService>(NpcTalkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
