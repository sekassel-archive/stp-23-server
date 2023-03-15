import {Injectable, OnModuleInit} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {SocketService} from '../../udp/socket.service';
import {User} from '../../user/user.schema';
import {Area} from '../area/area.schema';
import {AreaService} from '../area/area.service';
import {getProperty} from '../game.loader';
import {MoveTrainerDto} from './trainer.dto';
import {TrainerService} from './trainer.service';
import {Direction, Trainer} from "./trainer.schema";

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
export class TrainerHandler implements OnModuleInit {
  constructor(
    private trainerService: TrainerService,
    private socketService: SocketService,
    private areaService: AreaService,
  ) {
  }

  portals = new Map<string, Portal[]>;

  async onModuleInit() {
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
    const oldLocation = this.trainerService.getLocation(dto._id.toString());
    const otherTrainer = this.trainerService.getTrainerAt(dto.area, dto.x, dto.y);

    if (Math.abs(dto.x - oldLocation!.x) + Math.abs(dto.y - oldLocation!.y) > 1 // Invalid movement
      || otherTrainer && otherTrainer._id.toString() !== dto._id.toString() // Trainer already at location
    ) {
      dto.x = oldLocation!.x;
      dto.y = oldLocation!.y;
    }

    const portal = this.getPortal(dto.area, dto.x, dto.y);
    if (portal) {
      const {area, x, y} = portal.target;
      dto.area = area;
      dto.x = x;
      dto.y = y;
      // inform old area that the trainer left
      this.socketService.broadcast(`areas.${oldLocation.area}.trainers.${dto._id}.moved`, dto);
      await this.trainerService.saveLocations([dto]);
    }

    this.checkAllNPCsOnSight(dto);

    this.socketService.broadcast(`areas.${dto.area}.trainers.${dto._id}.moved`, dto);
    this.trainerService.setLocation(dto._id.toString(), dto);
  }

  getPortal(area: string, x: number, y: number) {
    const portals = this.portals.get(area) || [];
    for (const portal of portals) {
      if (x >= portal.x && x < portal.x + portal.width && y >= portal.y && y < portal.y + portal.height) {
        return portal;
      }
    }
    return null;
  }

  async checkAllNPCsOnSight(dto: MoveTrainerDto) {
    const npcs = await this.trainerService.findAll({npc: {$exists: true}});
    for (const npc of npcs) {
      if(this.checkNPConSight(dto, npc, 5)){
        // TODO: Player blockieren
        // Finds the movement direction of the npc towards the player
        const x = npc.direction === Direction.LEFT ? -1 : npc.direction === Direction.RIGHT ? 1 : 0;
        const y = npc.direction === Direction.UP ? -1 : npc.direction === Direction.DOWN ? 1 : 0;

        // Finds how many steps the npc has to walk to the player
        const moveRange = Math.abs(dto.x - npc.x) + Math.abs(dto.y - npc.y) - 1;

        // Add path points for moving npc towards player
        const path: number[] = [];
        for (let i = 1; i <= moveRange; i++){
          path.push(npc.x + i * x, npc.y + i * y);
        }
        await this.trainerService.update(npc._id.toString(), {'npc.path': path});
      }
    }
  }

  checkNPConSight(player: MoveTrainerDto, npc: Trainer, maxRange: number) : boolean {
    const xDifference = player.x - npc.x;
    const yDifference = player.y - npc.y;

    //Check if x or y is equals for npc and player
    if(xDifference !== 0 && yDifference !== 0) return false;

    //Check maxRange
    if(xDifference > maxRange || yDifference > maxRange) return false;

    // Check if NPC is looking at the player
    if(xDifference === 0){
      if((yDifference < 0 && npc.direction !== Direction.UP)
      || (yDifference > 0 && npc.direction !== Direction.DOWN)){
        return false;
      }
    }
    else{
      if((xDifference < 0 && npc.direction !== Direction.RIGHT)
        || (xDifference > 0 && npc.direction !== Direction.LEFT)){
        return false;
      }
    }

    // TODO: Check if objects are in the way of the npc
    return true;
  }
}
