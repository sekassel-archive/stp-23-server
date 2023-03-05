import {Injectable} from '@nestjs/common';
import {GroupService} from '../group/group.service';

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
  ) {
  }

  async resolve(namespace: Namespace, id: string): Promise<UserFilter> {
    switch (namespace) {
      case Namespace.groups:
        const group = await this.groupService.find(id);
        return group?.members ?? [];
      case Namespace.regions:
      // TODO v2: user trainers
      //  const members = await this.memberService.findAll(id);
      //  return members.map(member => member.user);
      case Namespace.global:
        return 'global';
      default:
        return [];
    }
  }
}
