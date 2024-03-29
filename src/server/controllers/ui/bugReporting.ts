import { Server } from '../../server';

import { Bugs } from '../../enums/logging';

import { Command } from '../../models/ui/chat/command';
import WebhookMessage from '../../models/webhook/discord/webhookMessage';

import { Ranks } from '../../../shared/enums/ranks';
import { Events } from '../../../shared/enums/events/events';
import { Callbacks } from '../../../shared/enums/events/callbacks';
import { EmbedColours } from '../../../shared/enums/logging/embedColours';

import sharedConfig from '../../../configs/shared.json';

export class BugReporting {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Callbacks
    this.server.cbManager.RegisterCallback(Callbacks.submitBug, this.CALLBACK_submitBug.bind(this));
  }

  // Methods
  private registerCommands(): void {
    new Command("bug", "Report a discovered bug.", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.startReporting);
        }
      }
    }, Ranks.User);
  }

  public init(): void {
    this.registerCommands();
  }

  // Callbacks
  private async CALLBACK_submitBug(data: Record<string, any>, source: number, cb: CallableFunction): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      if (player.Spawned) {
        let logType;

        switch (data.type) {
          case "SCRIPT":
            logType = Bugs.Script;
            break;
          case "VEHICLE":
            logType = Bugs.Vehicle;
            break;
          case "EUP":
            logType = Bugs.EUP;
            break;
          case "MAP":
            logType = Bugs.MLO;
            break;
        }

        cb(true);

        await this.server.logManager.Send(logType, new WebhookMessage({username: "Bug Reporting", embeds: [{
            color: EmbedColours.Green,
            title: "__Bug Reported__",
            description: `A player has reported a new bug.\n\n**Player Id**: ${player.Id}\n**Player Name**: ${player.GetName}\n**Player Rank**: ${Ranks[player.Rank]}\n**What Happened?**: ${data.description}\n**How To Reproduce?**: ${data.reproduction}\n**Evidence?**: ${data.evidence}`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    }
  }
}
