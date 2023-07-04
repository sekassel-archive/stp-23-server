import {Injectable} from "@nestjs/common";
import {Cron, CronExpression} from "@nestjs/schedule";
import {environment} from "../../environment";
import {OpponentService} from "./opponent.service";

@Injectable()
export class OpponentScheduler {
  constructor(
    private opponentService: OpponentService,
  ) {
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async deleteStaleOpponents() {
    const beforeDate = new Date(Date.now() - 1000 * 60 * 60 * environment.cleanup.opponentLifetimeMinutes);
    await this.opponentService.deleteMany({updatedAt: {$lt: beforeDate}});
  }
}
