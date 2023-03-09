import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Cron, CronExpression} from '@nestjs/schedule';
import {SocketService} from '../../udp/socket.service';
import {User} from '../../user/user.schema';
import {Area} from '../area/area.schema';
import {AreaService} from '../area/area.service';
import {getProperty} from '../game.loader';
import {MoveTrainerDto} from './trainer.dto';
import {TrainerService} from './trainer.service';

interface Portal {
  x: number;
  y: number;
  width: number;
  height: number;
  target: {
    area: string;
    x: number;
    y: number;
  };
}

@Injectable()
export class TrainerHandler implements OnModuleInit, OnModuleDestroy {
  constructor(
    private trainerService: TrainerService,
    private socketService: SocketService,
    private areaService: AreaService,
  ) {
  }

  locations = new Map<string, MoveTrainerDto>;

  portals = new Map<string, Portal[]>;

  async onModuleInit() {
    const locations = await this.trainerService.getLocations();
    for (const location of locations) {
      this.locations.set(location._id.toString(), location);
    }

    const areas = await this.areaService.findAll();
    for (const area of areas) {
      const portals = this.loadPortals(area, areas);
      this.portals.set(area._id.toString(), portals);
    }
  }

  private loadPortals(area: Area, areas: Area[]) {
    const portals: Portal[] = [];

    for (const layer of area.map.layers) {
      if (layer.type !== 'objectgroup') {
        continue;
      }
      for (const object of layer.objects) {
        if (object.class !== 'Portal') {
          continue;
        }

        const targetName = getProperty(object, 'Map');
        const targetArea = areas.find(a => a.name === targetName && a.region === area.region);
        if (!targetArea) {
          console.log('Invalid portal target:', targetName, 'in area', area.name, 'object', object.id);
          continue;
        }

        const portal: Portal = {
          x: object.x / area.map.tilewidth,
          y: object.y / area.map.tileheight,
          width: object.width / area.map.tilewidth,
          height: object.height / area.map.tileheight,
          target: {
            area: targetArea._id.toString(),
            x: getProperty<number>(object, 'X') || 0,
            y: getProperty<number>(object, 'Y') || 0,
          },
        };
        portals.push(portal);
      }
    }
    return portals;
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.trainerService.deleteUser(user._id.toString());
  }

  @OnEvent('areas.*.trainers.*.moved')
  async onTrainerMoved(dto: MoveTrainerDto) {
    // TODO validate movement
    const oldLocation = this.locations.get(dto._id.toString());

    for (const location of this.locations.values()) {
      if (location.x === dto.x && location.y === dto.y) {
        // Someone is already at this location
        dto.x = oldLocation!.x;
        dto.y = oldLocation!.y;
      }
    }

    const portals = this.portals.get(dto.area) || [];
    for (const portal of portals) {
      if (dto.x >= portal.x && dto.x < portal.x + portal.width && dto.y >= portal.y && dto.y < portal.y + portal.height) {
        const {area, x, y} = portal.target;
        dto.area = area;
        dto.x = x;
        dto.y = y;
        await this.trainerService.saveLocations([dto]);
        break;
      }
    }

    this.socketService.broadcast(`areas.${dto.area}.trainers.${dto._id}.moved`, dto);
    this.locations.set(dto._id.toString(), dto);
  }

  async onModuleDestroy() {
    await this.flushLocations();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async flushLocations() {
    await this.trainerService.saveLocations(Array.from(this.locations.values()));
  }
}
