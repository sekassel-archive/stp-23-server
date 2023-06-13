import {Injectable, Logger} from "@nestjs/common";
import {Cron, CronExpression} from "@nestjs/schedule";
import {TrainerService} from "./trainer.service";
import {RegionService} from "../../region/region.service";
import {environment} from "../../environment";

@Injectable()
export class TrainerScheduler {
  private logger = new Logger(TrainerScheduler.name);

  constructor(
    private regionService: RegionService,
    private trainerService: TrainerService,
  ) {
  }

  @Cron(CronExpression.EVERY_HOUR)
  async deleteUnprogressedTrainers() {
    const olderThanMs = 1000 * 60 * 60 * environment.cleanup.unprogressedTrainerLifetimeHours;
    const regions = await this.regionService.findAll();
    const results = await Promise.all(regions.map(region => this.trainerService.deleteUnprogressed(olderThanMs, region.spawn)));
    const deleted = results.reduce((acc, val) => acc + val.deletedCount, 0);
    deleted && this.logger.log(`Deleted ${deleted} unprogressed trainers`);
  }
}
