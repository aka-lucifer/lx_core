import { Server} from "../../server";
import { Inform, Error } from "../../utils";
import {LogTypes} from "../../enums/logging";

import { ChatLog } from "../../models/database/chatLog";
import WebhookMessage from "../../models/webhook/discord/webhookMessage";
import {Command} from "../../models/ui/chat/command";
import { Player } from "../../models/database/player";
import {Kick} from "../../models/database/kick";

import { ProximityTypes } from "../characters"; 

import { Message } from "../../../shared/models/ui/chat/message";
import { Events } from "../../../shared/enums/events/events";
import { Ranks } from "../../../shared/enums/ranks";
import {ChatTypes, SystemTypes} from "../../../shared/enums/ui/chat/types";
import { Callbacks } from "../../../shared/enums/events/callbacks";
import {EmbedColours} from "../../../shared/enums/logging/embedColours";

import {FormattedWarning} from "../../../client/models/ui/warning";
import {FormattedCommend} from "../../../client/models/ui/commend";

import serverConfig from "../../../configs/server.json";
import sharedConfig from "../../../configs/shared.json";
import { Jobs } from '../../../shared/enums/jobs/jobs';
import { Playtime } from '../../models/database/playtime';

export class ChatManager {
  private server: Server;
  private chatFrozen: boolean = false;
  private playerWarnings: any[] = [];
  private blacklistedWords: string[] = serverConfig.bannedContent.words;
  private blacklistedLinks: string[] = serverConfig.bannedContent.links;

  constructor(server: Server) {
    this.server = server;

    // Callbacks
    this.server.cbManager.RegisterCallback(Callbacks.sendMessage, async(data: Record<string, any>, source: number, cb: CallableFunction) => {
      const src = source.toString();
      const player = await this.server.connectedPlayerManager.GetPlayer(src);
      if (player.Spawned) {
        const message = new Message(data.message, data.type);

        if (server.IsDebugging) Inform("Message Sent", JSON.stringify(message));
        if (message.content[0] == "/") { // If it's a command
          const args = String(message.content).replace("/", "").split(" "); // All of the arguments of the message
          const command = args[0].toLowerCase();
          const commands = this.server.commandManager.Commands;
          const jobCommands = this.server.commandManager.JobCommands

          if (commands.findIndex(cmd => cmd.name == command) !== -1) {
            args.splice(0, 1); // Remove the first argument (the command) from the args table.
            CancelEvent();
    
            for (let a = 0; a < commands.length; a++) {
              if (command == commands[a].name) {
                if (player.Rank >= commands[a].permission) {
                  if (commands[a].argsRequired) {
                    if (Object.keys(commands[a].args).length > 0 && args.length >= Object.keys(commands[a].args).length) {
                      // Make sure the entered args aren't empty strings
                      for (let b = 0; b < args.length; b++) {
                        if (args[b].length <= 0) {
                          cb(false);
                          return await player.TriggerEvent(Events.sendSystemMessage, new Message("All command arguments must be entered!", SystemTypes.Error));
                        }
                      }

                      // Run the command
                      commands[a].callback(player.Handle, args);
                      cb(true);
                    } else {
                      Error("Chat Manager", "All command arguments must be entered!");
                      await player.TriggerEvent(Events.sendSystemMessage, new Message("All command arguments must be entered!", SystemTypes.Error));
                      cb(false);
                    }
                  } else {
                    cb(true);
                    commands[a].callback(player.Handle, args);
                  }
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("Access Denied!", SystemTypes.Error));
                  cb(false);
                }
              }
            }
          } else if (jobCommands.filter(cmd => cmd.name == command).length > 0) {
            args.splice(0, 1); // Remove the first argument (the command) from the args table.
            CancelEvent();
    
            for (let a = 0; a < jobCommands.length; a++) {
              if (command == jobCommands[a].name) {
                let hasPermission = false;

                if (typeof jobCommands[a].permission == "object") {

                  // Define permissions into static string array instead of (Jobs string or Jobs array)
                  const permissions = jobCommands[a].permission as string[];

                  // Check if your current job name exists on the job command permissions
                  const permissionIndex = permissions.findIndex(permission => permission == player.selectedCharacter.job.name);

                  // Set permission to whether or not the index is equal to -1 (true exists (0 & greater), false doesn't exist (-1))
                  hasPermission = permissionIndex !== -1;
                } else {
                  hasPermission = player.selectedCharacter.job.name == jobCommands[a].permission;
                }

                if (hasPermission) {
                  if (jobCommands[a].argsRequired) {
                    if (Object.keys(jobCommands[a].args).length > 0 && args.length >= Object.keys(jobCommands[a].args).length) {
                      jobCommands[a].callback(player.Handle, args);
                      cb(true);
                    } else {
                      Error("Chat Manager", "All command arguments must be entered!");
                      await player.TriggerEvent(Events.sendSystemMessage, new Message("All command arguments must be entered!", SystemTypes.Error));
                      cb(false);
                    }
                  } else {
                    cb(true);
                    jobCommands[a].callback(player.Handle, args);
                  }
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("Job Access Denied!", SystemTypes.Error));
                  cb(false);
                }
              }
            }
          } else {
            Error("Chat Manager", `Command (/${command}) doesn't exist!`)
            await player.TriggerEvent(Events.sendSystemMessage, new Message(`Command (/${command}) doesn't exist!`, SystemTypes.Error));
            cb(false);
            return;
          }
        } else {
          // Log chat into DB table
          const chatLog = new ChatLog(player, message);
          await chatLog.save();

          // Message blacklist checker (doesn't run if you're snr admin or above)
          if (player.Rank < Ranks.SeniorAdmin) {
            // Chat message blacklist checker
            const wordIndex = this.blacklistedWords.findIndex(word => {
              if (message.content.includes(word)) {
                return true;
              }
            });

            const linkIndex = this.blacklistedLinks.findIndex(link => {
              if (message.content.includes(link)) {
                return true;
              }
            });

            // Blacklisted word detection
            if (wordIndex != -1) {
              // Define warnings.ts
              if (this.playerWarnings[player.Id] === undefined) {
                this.playerWarnings[player.Id] = 1;
              } else {
                this.playerWarnings[player.Id]++;
              }

              // console.log(`Your warnings are now(${this.playerWarnings[player.Id]})`);

              // Allow chat input
              cb(true);

              // Warning Processor
              if (this.playerWarnings[player.Id] >= 3) {
                const kick = new Kick(player.Id, "Sent a chat message containing blacklisted contents after several warnings.ts", player.Id);
                kick.IssuedBy = player;
                kick.Receiver = player;
                kick.systemKick = true;
                
                await kick.save();
                kick.drop();
                return;
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message(`You have recieved a warning for sending a chat message containing blacklisted contents ^3(${this.blacklistedWords[wordIndex]})`, SystemTypes.Admin));
              }

              // Log your warning to discord
              await server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Blacklisted Content", embeds: [{
                  color: EmbedColours.Red,
                  title: "__Blacklisted Chat Message__",
                  description: `A player has sent a chat message containing blacklisted contents.\n\n**Username**: ${player.GetName}\n**Content**: ${this.blacklistedWords[wordIndex]}\n**Message**: ${message.content}\n**Detected By**: System`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));

              return;
            }

            // Blacklisted link detection

            if (linkIndex != -1) {
              // Define warnings.ts
              if (this.playerWarnings[player.Id] === undefined) {
                this.playerWarnings[player.Id] = 1;
              } else {
                this.playerWarnings[player.Id]++;
              }

              // console.log(`Your warnings are now(${this.playerWarnings[player.Id]})`);

              // Allow chat input
              cb(true);

              // Warning Processor
              if (this.playerWarnings[player.Id] >= 3) {
                const kick = new Kick(player.Id, "Sent a chat message containing blacklisted contents after several warnings.ts", player.Id);
                kick.IssuedBy = player;
                kick.Receiver = player;
                kick.systemKick = true;

                await kick.save();
                kick.drop();
                return;
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message(`You have recieved a warning for sending a chat message containing blacklisted contents ^3(${this.blacklistedLinks[linkIndex]})`, SystemTypes.Admin));
              }

              // Log your warning to discord
              await server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Blacklisted Content", embeds: [{
                  color: EmbedColours.Red,
                  title: "__Blacklisted Chat Message__",
                  description: `A player has sent a chat message containing blacklisted contents.\n\n**Username**: ${player.GetName}\n**Content**: ${this.blacklistedLinks[linkIndex]}\n**Message**: ${message.content}\n**Detected By**: System`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));

              return;
            }
          }

          // Send chat messages
          const connectedPlayers = this.server.connectedPlayerManager.GetPlayers;

          if (message.type == ChatTypes.Admin) { // Administration Chat
            for (let i = 0; i < connectedPlayers.length; i++) {
              const otherPlayer = connectedPlayers[i];
              // console.log(`[${otherPlayer.Handle}: ${JSON.stringify(otherPlayer)}`);

              if (otherPlayer.Rank >= Ranks.Admin) {
                await otherPlayer.TriggerEvent(Events.sendClientMessage, message, player.GetName);

                if (player.Handle !== otherPlayer.Handle) {
                  await otherPlayer.TriggerEvent(Events.soundFrontEnd, "Menu_Accept", "Phone_SoundSet_Default");
                }
              }
            }

            cb(true);
          } else if (message.type == ChatTypes.Local) { // Normal Local Chat
            const character = await this.server.characterManager.Get(player);

            if (character) {
              const sent = await this.server.characterManager.proximityMessage(ProximityTypes.Local, message, character);
              cb(sent);
            }
          } else if (message.type == ChatTypes.Global) { // Global Chat
            const character = await this.server.characterManager.Get(player);

            if (character) {
              emitNet(Events.sendClientMessage, -1, message, `${player.GetName} | ${character.Name}`);
              cb(true);
            }
          }

          const sendersDisc = await player.GetIdentifier("discord");
          await this.server.logManager.Send(LogTypes.Chat, new WebhookMessage({username: "Chat Logs", embeds: [{
              color: EmbedColours.Green,
              title: "__Chat Message__",
              description: `A player has sent a chat message.\n\n**Message**: ${message.content}\n**Type**: ${ChatTypes[message.type]}\n**Sent By**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${sendersDisc != "Unknown" ? `<@${sendersDisc}>` : sendersDisc}`,
              footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        }
      }
    });
  }

  public init(): void {
    new Command("clearchat", "Clears all of the chats messages", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          emitNet(Events.clearChat, -1);
          emitNet(Events.sendSystemMessage, -1, new Message(`The chat has been cleared by ^3[${Ranks[player.Rank]}] ^0- ^3${player.GetName}!`, SystemTypes.Announcement));
        }
      }
    }, Ranks.Moderator);

    new Command("freezechat", "Freezes the chat", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          this.chatFrozen = !this.chatFrozen;
          emitNet(Events.freezeChat, -1, this.chatFrozen);
          if (this.chatFrozen) {
            emitNet(Events.sendSystemMessage, -1, new Message(`The chat has been frozen by ^3[${Ranks[player.Rank]}] ^0- ^3${player.GetName}!`, SystemTypes.Announcement));
          } else {
            emitNet(Events.sendSystemMessage, -1, new Message(`The chat has been unfrozen by ^3[${Ranks[player.Rank]}] ^0- ^3${player.GetName}!`, SystemTypes.Announcement));
          }
        }
      }
    }, Ranks.Moderator);

    new Command("warnings", "Display all of your warnings", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const receivedWarnings: FormattedWarning[] = [];
          const warnings = await this.server.warnManager.getPlayerWarnings(player.Id);

          for (let i = 0; i < warnings.length; i++) {
            if (!warnings[i].systemWarning) {
              const player = await this.server.playerManager.getPlayerFromId(warnings[i].WarnedById);
              receivedWarnings.push({
                id: warnings[i].Id,
                issuedBy: `[${Ranks[player.Rank]}] - ${player.GetName}`,
                reason: warnings[i].Reason,
                issuedOn: warnings[i].IssuedOn.toUTCString()
              });
            } else {
              receivedWarnings.push({
                id: warnings[i].Id,
                issuedBy: "System",
                reason: warnings[i].Reason,
                issuedOn: warnings[i].IssuedOn.toUTCString()
              });
            }
          }

          await player.TriggerEvent(Events.receiveWarnings, receivedWarnings);
        }
      }
    }, Ranks.User);

    new Command("commends", "Display all of your commends", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const receivedCommends: FormattedCommend[] = [];
          const commends = await this.server.commendManager.getPlayerCommends(player.Id);

          for (let i = 0; i < commends.length; i++) {
            const player = await this.server.playerManager.getPlayerFromId(commends[i].IssuedById);
            receivedCommends.push({
              id: commends[i].Id,
              issuedBy: `[${Ranks[player.Rank]}] - ${player.GetName}`,
              reason: commends[i].Reason,
              issuedOn: commends[i].IssuedOn.toUTCString()
            });
          }

          await player.TriggerEvent(Events.receiveCommends, receivedCommends);
        }
      }
    }, Ranks.User);

    new Command("cmds", "See all the server commands", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          let commandString = "";

          const commands = this.server.commandManager.Commands;
          const jobCommands = this.server.commandManager.JobCommands;

          for (let a = 0; a < commands.length; a++) { // Loop through all the commands
            if (player.Rank >= commands[a].permission) { // If you've permission to use the command
              if (a < (commands.length - 1)) { // If not the last entry from the registered command
                if (commandString.length > 0) { // If the command string isn't empty, add to it
                  commandString = `${commandString}^0, ^3/${commands[a].name}`;
                } else { // If the command string is empty
                  commandString = `^3/${commands[a].name}`;
                }
              } else { // Last entry
                commandString = `${commandString}^0, ^3/${commands[a].name}^0.`;
              }
            }
          }

          for (let b = 0; b < jobCommands.length; b++) { // Loop through all the commands
            const permission: Jobs[] | Jobs = jobCommands[b].permission;
            let hasPermission = false;

            if (typeof permission === "object") {
              const permissionIndex = permission.findIndex(permission => permission == player.selectedCharacter.job.name);
              hasPermission = permissionIndex !== -1;
            } else {
              hasPermission = player.selectedCharacter.job.name == permission;
            }

            if (hasPermission) { // If you've permission to use the command
              if (b < (jobCommands.length - 1)) { // If not the last entry from the registered command
                if (commandString.length > 0) { // If the command string isn't empty, add to it
                  commandString = `${commandString}^0, ^3/${jobCommands[b].name}`;
                } else { // If the command string is empty
                  commandString = `^3/${jobCommands[b].name}`;
                }
              } else { // Last entry
                commandString = `${commandString}^0, ^3/${jobCommands[b].name}^0.`;
              }
            }
          }

          await player.TriggerEvent(Events.sendSystemMessage, new Message(`Commands - ${commandString}`, SystemTypes.Announcement));
        }
      }
    }, Ranks.User);

    new Command("playtime", "See your server playtime", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const playtime = await player.CurrentPlaytime();
          await player.TriggerEvent(Events.sendSystemMessage, new Message(`Your server playtime is ${await new Playtime(playtime).FormatTime()}.`, SystemTypes.Success));
        }
      }
    }, Ranks.User);
  }

  public async generateTypes(player: Player, UIUpdate: boolean = false): Promise<void> {
    const chatTypes: string[] = [];
    
    Object.keys(ChatTypes).forEach(type => {
      const chatType = parseInt(type);
      if (!isNaN(chatType)) {
        const stringType = ChatTypes[chatType].toLowerCase();
        if (stringType != "system" && stringType != "admin") {
          chatTypes.push(stringType);
        }
      }
    });

    if (player.Rank >= Ranks.Admin) {
      chatTypes.push("admin");
    }

    await player.TriggerEvent(Events.setTypes, chatTypes, UIUpdate);
  }
}
