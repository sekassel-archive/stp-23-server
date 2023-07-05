import {Injectable, Logger} from "@nestjs/common";
import {Cron, CronExpression} from "@nestjs/schedule";
import {environment} from "../../environment";
import {OpponentService} from "./opponent.service";

@Injectable()
export class OpponentScheduler {
  private logger = new Logger(OpponentScheduler.name);

  constructor(
    private opponentService: OpponentService,
  ) {
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async deleteStaleOpponents() {
    const beforeDate = new Date(Date.now() - 1000 * 60 * 60 * environment.cleanup.opponentLifetimeMinutes);
    const result = await this.opponentService.deleteMany({updatedAt: {$lt: beforeDate}});
    result.deletedCount && this.logger.warn(`Deleted ${result.deletedCount} stale opponents`);
  }
}
