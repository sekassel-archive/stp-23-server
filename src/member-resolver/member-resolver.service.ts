import {Injectable} from '@nestjs/common';
import {TrainerService} from '../game/trainer/trainer.service';
import {GroupService} from '../group/group.service';
import {Types} from "mongoose";

export enum Namespace {
  groups = 'groups',
  regions = 'regions',
  global = 'global',
}

export type UserFilter = string[] | 'global';

@Injectable()
export class MemberResolverService {
  constructor(
    private groupService: GroupService,
    private trainerService: TrainerService,
  ) {
  }

  async resolve(namespace: Namespace, id: Types.ObjectId): Promise<UserFilter> {
    switch (namespace) {
      case Namespace.groups:
        const group = await this.groupService.find(id);
        return group?.members ?? [];
      case Namespace.regions:
        const trainers = await this.trainerService.findAll({region: id.toString()});
        return trainers.filter(t => !t.npc).map(member => member.user);
      case Namespace.global:
        return 'global';
      default:
        return [];
    }
  }
}
