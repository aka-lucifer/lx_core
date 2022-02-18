import {Server} from "../../server";
import { Dist, Log, Inform, Error, NumToVector3 } from "../../utils";
import {LogTypes} from "../../enums/logTypes";

import { ChatLog } from "../../models/database/chatLog";
import WebhookMessage from "../../models/webhook/discord/webhookMessage";
import {Command} from "../../models/ui/chat/command";

import { Message } from "../../../shared/models/ui/chat/message";
import { Events } from "../../../shared/enums/events";
import { Ranks } from "../../../shared/enums/ranks";
import {ChatTypes, SystemTypes} from "../../../shared/enums/ui/types";
import { Callbacks } from "../../../shared/enums/callbacks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import sharedConfig from "../../../configs/shared.json";
import {Ban} from "../../models/database/ban";
import {Kick} from "../../models/database/kick";

export class ChatManager {
  private server: Server;
  private chatFrozen: boolean = false;

  constructor(server: Server) {
    this.server = server;

    // Callbacks
    onNet(Callbacks.sendMessage, async(data: Record<string, any>) => {
      const src = source;
      const player = await this.server.playerManager.GetPlayer(src);
      const message = new Message(data.message, data.type);

      if (server.IsDebugging) Inform("Message Sent", JSON.stringify(message));
      if (message.content.includes("/")) { // If it's a command
        const args = String(message.content).replace("/", "").split(" "); // All of the arguments of the message
        const command = args[0].toLowerCase();
        const registeredCommands = this.server.commandManager.Commands;

        if (registeredCommands.filter(cmd => cmd.name == command).length <= 0) {
          Error("Chat Manager", `Command (/${command}) doesn't exist!`)
          await player.TriggerEvent(Events.sendSystemMessage, new Message(`Command (/${command}) doesn't exist!`, SystemTypes.Error));
          emitNet(Events.receiveServerCB, src, false, data);
          return;
        } else {
          args.splice(0, 1); // Remove the first argument (the command) from the args table.
          CancelEvent();
  
          for (let a = 0; a < registeredCommands.length; a++) {
            if (command == registeredCommands[a].name) {
              if (player.GetRank >= registeredCommands[a].permission) {
                if (registeredCommands[a].argsRequired) {
                  if (Object.keys(registeredCommands[a].args).length > 0 && args.length >= Object.keys(registeredCommands[a].args).length) {
                    registeredCommands[a].callback(player.GetHandle, args);
                    emitNet(Events.receiveServerCB, src, true, data);
                  } else {
                    Error("Chat Manager", "All command arguments must be entered!");
                    await player.TriggerEvent(Events.sendSystemMessage, new Message("All command arguments must be entered!", SystemTypes.Error));
                    emitNet(Events.receiveServerCB, src, false, data);
                  }
                } else {
                  registeredCommands[a].callback(player.GetHandle, args);
                  emitNet(Events.receiveServerCB, src, true, data);
                }
              } else {
                Error("Chat Manager", "Access Denied!");
                await player.TriggerEvent(Events.sendSystemMessage, new Message("Access Denied!", SystemTypes.Error));
                emitNet(Events.receiveServerCB, src, false, data);
              }
            }
          }
        }
      } else {
        const connectedPlayers = this.server.playerManager.GetPlayers;

        if (message.type == ChatTypes.Admin) {
          for (let i = 0; i < connectedPlayers.length; i++) {
            const otherPlayer = connectedPlayers[i];
            // console.log(`[${otherPlayer.GetHandle}: ${JSON.stringify(otherPlayer)}`);

            if (otherPlayer.GetRank >= Ranks.Admin) {
              await connectedPlayers[i].TriggerEvent(Events.sendClientMessage, message, player.GetName);
            }
          }
          emitNet(Events.receiveServerCB, src, true, data);
        } else if (message.type == ChatTypes.Local) {
          for (let i = 0; i < connectedPlayers.length; i++) {
            const otherPlayer = connectedPlayers[i];
            const myPos = NumToVector3(GetEntityCoords(GetPlayerPed(player.GetHandle)));
            const otherPos = NumToVector3(GetEntityCoords(GetPlayerPed(otherPlayer.GetHandle)));

            const dist = Dist(myPos, otherPos, false);
            Log("Proximity Message", `My Position: ${JSON.stringify(myPos)} | Other Position: ${JSON.stringify(otherPos)} | Dist: ${dist}`);

            if (dist <= 60.0) {
              Inform("Proximity Message", `Player (${otherPlayer.GetName}) is close enough to recieve the proximity message sent from (${player.GetName})`);
              await otherPlayer.TriggerEvent(Events.sendClientMessage, message, player.GetName);
            }
          }
          emitNet(Events.receiveServerCB, src, true, data);
        } else {
          emitNet(Events.sendClientMessage, -1, message, player.GetName);
          emitNet(Events.receiveServerCB, src, true, data);
        }

        // do blacklist check in here

        const chatLog = new ChatLog(player, message);
        await chatLog.save();

        const sendersDisc = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Chat, new WebhookMessage({username: "Chat Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__Chat Message__",
            description: `A player has sent a chat message.\n\n**Message**: ${message.content}\n**Type**: ${ChatTypes[message.type]}\n**Sent By**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Discord**: ${sendersDisc != "Unknown" ? `<@${sendersDisc}>` : sendersDisc}`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    });
  }

  public init(): void {
    new Command("clearchat", "Clears all of the chats messages", [], false, async(source: string) => {
      const player = await this.server.playerManager.GetPlayer(source);
      emitNet(Events.clearChat, -1);
      emitNet(Events.sendSystemMessage, -1, new Message(`The chat has been cleared by ^3[${Ranks[player.GetRank]}] ^0- ^3${player.GetName}!`, SystemTypes.Announcement));
    }, Ranks.Admin);

    new Command("freezechat", "Freezes the chat", [], false, async(source: string) => {
      const player = await this.server.playerManager.GetPlayer(source);
      this.chatFrozen = !this.chatFrozen;
      emitNet(Events.freezeChat, -1, this.chatFrozen);
      if (this.chatFrozen) {
        emitNet(Events.sendSystemMessage, -1, new Message(`The chat has been frozen by ^3[${Ranks[player.GetRank]}] ^0- ^3${player.GetName}!`, SystemTypes.Announcement));
      } else {
        emitNet(Events.sendSystemMessage, -1, new Message(`The chat has been unfrozen by [${Ranks[player.GetRank]}] - ${player.GetName}!`, SystemTypes.Announcement));
      }
    }, Ranks.Admin);

    new Command("id", "Logs your server ID into the server console", [], false, async(source: string) => {
      console.log("id", source);
    }, Ranks.Admin);

    new Command("ban", "Freezes the chat", [{name: "server_id", help: "Players server ID"}], true, async(source: string, args: any) => {
      const player = await this.server.playerManager.GetPlayer(source);
      if (args[0]) {
        const banDate = new Date();
        banDate.setFullYear(2022, 1, 18);
        banDate.setHours(21, 15, 0);

        const banningPlayer = await this.server.playerManager.GetPlayer(args[0]);
        const ban = new Ban(banningPlayer.Id, banningPlayer.HardwareId, "Testing ban", player.Id, banDate);
        ban.Banner = player;
        await ban.save();
        ban.drop();
      }
    }, Ranks.Admin);

    new Command("kick", "Kick player", [{name: "server_id", help: "Players server ID"}], true, async(source: string, args: any) => {
      const player = await this.server.playerManager.GetPlayer(source);
      if (args[0]) {
        const kickedPlayer = await this.server.playerManager.GetPlayer(args[0]);
        const kick = new Kick(kickedPlayer.Id,"Testing kick", player.Id);
        kick.Kicker = player;
        await kick.save();
        kick.drop();
      }
    }, Ranks.Admin);
  }
}
