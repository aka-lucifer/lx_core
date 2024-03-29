import { server } from "../../server";

import {Player} from "./player";
import { DBPlayer } from "./dbPlayer";

import WebhookMessage from "../webhook/discord/webhookMessage";
import * as Database from "../../managers/database/database";

import {LogTypes} from "../../enums/logging";
import {BanStates} from "../../../shared/enums/bans";

import {Error} from "../../utils";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/logging/embedColours";
import {ErrorCodes} from "../../../shared/enums/logging/errors";
import * as sharedConfig from "../../../configs/shared.json"
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/chat/types";
import { addZero } from "../../../shared/utils";

export class Ban {
  private id: number;

  private readonly receiverId: number;
  private receiver: Player;

  private hardwareId: string;
  private banReason: string;
  private state: BanStates = BanStates.Active;

  private issuedById: number;
  private issuedBy: Player;
  
  private offlineReceiver: DBPlayer;

  private issuedOn: Date;
  private issuedUntil: Date;

  private logger: LogTypes = LogTypes.Staff;
  private url: string;
  private offlineBan: boolean = false;

  constructor(playerId: number, hwid: string, reason: string, issuedBy: number, issuedUntil?: Date) { // Default ban (PERM)
    this.receiverId = playerId;
    this.hardwareId = hwid;
    this.banReason = reason;
    this.issuedById = issuedBy;
    if (issuedUntil == undefined) {
      this.issuedUntil = new Date();
      this.issuedUntil.setFullYear(2099, 12, 31);
    } else {
      const currDate = new Date();
      this.issuedUntil = issuedUntil;
      this.issuedUntil.setHours(currDate.getHours(), currDate.getMinutes(), currDate.getSeconds());
    }

    // Inform("Ban Class", `Defined Ban Class Data: ${JSON.stringify((this))}`);
  }

  // Getters & Setters Requests
  public get Id(): number {
    return this.id;
  }

  public set Id(newId: number) {
    this.id = newId;
  }

  public get ReceiverId(): number {
    return this.receiverId;
  }

  public get Reason(): string {
    return this.banReason;
  }

  public get State(): BanStates {
    return this.state;
  }

  public set State(newState: BanStates) {
    this.state = newState;
  }

  public get IssuedById(): number {
    return this.issuedById;
  }

  public set Receiver(newPlayer: Player) {
    this.receiver = newPlayer;
  }

  public set OfflineReceiver(newPlayer: DBPlayer) {
    this.offlineReceiver = newPlayer;
  }

  public set IssuedBy(newPlayer: Player) {
    this.issuedBy = newPlayer;
  }

  public get IssuedUntil(): Date {
    return this.issuedUntil;
  }

  public set IssuedOn(dateIssued: Date) {
    this.issuedOn = dateIssued;
  }

  public set Logger(newType: LogTypes) {
    this.logger = newType;
  }

  public set URL(newUrl: string) {
    this.url = newUrl;
  }

  public get OfflineBan(): boolean {
    return this.offlineBan;
  }

  public set OfflineBan(newValue: boolean) {
    this.offlineBan = newValue;
  }

  // Methods
  public async save(): Promise<boolean> {
    if (this.hardwareId == undefined) this.hardwareId = "3:5789056eef77a45102ba83c183e84a0bfa7e9ea5a122352da1ada9fd366d6d07";
    const bannedUntil = `${this.issuedUntil.getFullYear()}-${addZero(this.issuedUntil.getMonth() + 1)}-${addZero(this.issuedUntil.getDate())} ${addZero(this.issuedUntil.getHours())}:${addZero(this.issuedUntil.getMinutes())}:${addZero(this.issuedUntil.getSeconds())}`;

    const inserted = await Database.SendQuery("INSERT INTO `player_bans` (`player_id`, `hardware_id`, `reason`, `ban_state`, `issued_by`, `issued_until`) VALUES (:playerId, :hardwareId, :banReason, :banState, :issuedBy, :issuedUntil)", {
      playerId: this.receiverId,
      hardwareId: this.hardwareId,
      banReason: this.banReason,
      banState: this.state,
      issuedBy: this.issuedById,
      issuedUntil: bannedUntil
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      this.id = inserted.meta.insertId;

      if (!this.offlineBan) {
        if (this.receiver.Rank > Ranks.User && this.receiver.Rank < Ranks.Moderator) { // If they have a higher rank than user and aren't, staff, reset them back to user.
          await this.receiver.UpdateRank(Ranks.User);
        }

        if (this.issuedUntil.getFullYear() < 2099) { // Non perm ban
          if (this.issuedById !== this.receiverId) {
            const bannersDiscord = await this.issuedBy.GetIdentifier("discord");
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Banned__",
                image: {
                  url: this.logger == LogTypes.Anticheat && this.url != undefined ? this.url : undefined
                },
                description: `A player has been temporarily banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.receiver.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: [${Ranks[this.receiver.Rank]}] - ${this.receiver.GetName}\n**Banners Discord**: ${bannersDiscord != "Unknown" ? `<@${bannersDiscord}>` : bannersDiscord}\n**Unban Date**: ${this.issuedUntil.toUTCString()}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          } else {
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Banned__",
                image: {
                  url: this.logger == LogTypes.Anticheat && this.url != undefined ? this.url : undefined
                },
                description: `A player has been temporarily banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.receiver.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: System\n**Unban Date**: ${this.issuedUntil.toUTCString()}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        } else { // Perm ban
          console.log("standard perm ban", this.issuedById, this.receiverId);
          console.log("issuedBy", this.issuedBy);
          console.log("recieved", this.receiver);
          if (this.issuedById !== this.receiverId) {
            const bannersDiscord = await this.issuedBy.GetIdentifier("discord");
            
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Banned__",
                description: `A player has been permanently banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.receiver.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: [${Ranks[this.issuedBy.Rank]}] - ${this.issuedBy.GetName}\n**Banners Discord**: ${bannersDiscord != "Unknown" ? `<@${bannersDiscord}>` : bannersDiscord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          } else {
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Banned__",
                image: {
                  url: this.logger == LogTypes.Anticheat && this.url != undefined ? this.url : undefined
                },
                description: `A player has been permanently banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.receiver.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: System`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        }

        server.banManager.Add(this);
        await this.receiver.getTrustscore(); // Refresh the players trustscore
        return true;
      } else {
        if (this.offlineReceiver.Rank > Ranks.User && this.offlineReceiver.Rank < Ranks.Moderator) { // If they have a higher rank than user and aren't, staff, reset them back to user.
          await this.offlineReceiver.UpdateRank(Ranks.User);
        }

        if (this.issuedBy !== undefined) { // If offline banned by staff in game
          if (this.issuedUntil.getFullYear() < 2099) { // Non perm ban
            emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.offlineReceiver.GetName} ^0has been offline banned from ^3${sharedConfig.serverName}^0, by [^3${Ranks[this.issuedBy.Rank]}^0] - ^3${this.issuedBy.GetName} ^0for ^3${this.banReason}^0, until ^3${this.issuedUntil.toUTCString()}^0!`, SystemTypes.Admin));

            const bannersDiscord = await this.issuedBy.GetIdentifier("discord");
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Offline Banned__",
                description: `A player has been temporarily banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.offlineReceiver.GetName}\n**Reason**: ${this.banReason}\n**Unban Date**: ${this.issuedUntil.toUTCString()}\n**Banned By**: [${Ranks[this.issuedBy.Rank]}] - ${this.issuedBy.GetName}\n**Banners Discord**: ${bannersDiscord != "Unknown" ? `<@${bannersDiscord}>` : bannersDiscord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          } else { // Perm ban
            emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.offlineReceiver.GetName} ^0has been permanently banned from ^3${sharedConfig.serverName}^0, by [^3${Ranks[this.issuedBy.Rank]}^0] - ^3${this.issuedBy.GetName} ^0for ^3${this.banReason}^0!`, SystemTypes.Admin));

            const bannersDiscord = await this.issuedBy.GetIdentifier("discord");
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Offline Banned__",
                description: `A player has been permanently banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.offlineReceiver.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: [${Ranks[this.issuedBy.Rank]}] - ${this.issuedBy.GetName}\n**Banners Discord**: ${bannersDiscord != "Unknown" ? `<@${bannersDiscord}>` : bannersDiscord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        } else { // If banned by RCON "/offline_ban" command
          if (this.issuedUntil.getFullYear() < 2099) { // Non perm ban
            emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.offlineReceiver.GetName} ^0has been offline banned from ^3${sharedConfig.serverName}^0, by ^3System ^0for ^3${this.banReason}^0, until ^3${this.issuedUntil.toUTCString()}^0!`, SystemTypes.Admin));

            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Offline Banned__",
                description: `A player has been temporarily banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.offlineReceiver.GetName}\n**Reason**: ${this.banReason}\n**Unban Date**: ${this.issuedUntil.toUTCString()}\n**Banned By**: System`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          } else { // Perm ban
            emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.offlineReceiver.GetName} ^0has been permanently banned from ^3${sharedConfig.serverName}^0, by ^3System ^0for ^3${this.banReason}^0!`, SystemTypes.Admin));
            
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Offline Banned__",
                description: `A player has been permanently banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.offlineReceiver.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: System`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        }

        server.banManager.Add(this);
        return true;
      }
    }

    return false;
  }

  public drop(): void {
    if (this.issuedById !== this.receiverId) {
      if (this.issuedUntil.getFullYear() < 2099) {
        emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.receiver.GetName} ^0has been banned from ^3${sharedConfig.serverName}^0, by ^3[${Ranks[this.issuedBy.Rank]}] - ^3${this.issuedBy.GetName} ^0for ^3${this.banReason}^0, until ^3${this.issuedUntil.toUTCString()}^0!`, SystemTypes.Admin));
        DropPlayer(this.receiver.Handle, `\n__[${sharedConfig.serverName}]__: You were temporarily banned from ${sharedConfig.serverName}.\n__Ban Id__: #${this.id}\n__By__: [${Ranks[this.issuedBy.Rank]}] - ${this.issuedBy.GetName}\n__Reason__: ${this.banReason}\n__Expires__: ${this.issuedUntil.toUTCString()}`);
      } else {
        emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.receiver.GetName} ^0has been permanently banned from ^3${sharedConfig.serverName}^0, by ^3[${Ranks[this.issuedBy.Rank]}] - ^3${this.issuedBy.GetName} ^0for ^3${this.banReason}^0!`, SystemTypes.Admin));
        DropPlayer(this.receiver.Handle, `\n__[${sharedConfig.serverName}]__: You were permanently banned from ${sharedConfig.serverName}.\n__Ban Id__: #${this.id}\n__By__: [${Ranks[this.issuedBy.Rank]}] - ${this.issuedBy.GetName}\n__Reason__: ${this.banReason}`);
      }
    } else {
      if (this.issuedUntil.getFullYear() < 2099) {
        emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.receiver.GetName} ^0has been banned from ^3${sharedConfig.serverName}^0, by ^3System ^0for ^3${this.banReason}^0, until ^3${this.issuedUntil.toUTCString()}^0!`, SystemTypes.Admin));
        DropPlayer(this.receiver.Handle, `\n__[${sharedConfig.serverName}]__: You were temporarily banned from ${sharedConfig.serverName}.\n__Ban Id__: #${this.id}\n__By__: System\n__Reason__: ${this.banReason}\n__Expires__: ${this.issuedUntil.toUTCString()}`);
      } else {
        emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.receiver.GetName} ^0has been permanently banned from ^3${sharedConfig.serverName}^0, by ^3System ^0for ^3${this.banReason}^0!`, SystemTypes.Admin));
        DropPlayer(this.receiver.Handle, `\n__[${sharedConfig.serverName}]__: You were permanently banned from ${sharedConfig.serverName}.\n__Ban Id__: #${this.id}\n__By__: System\n__Reason__: ${this.banReason}`);
      }
    }
  }

  public async remove(): Promise<boolean> {
    const playerData = await Database.SendQuery("SELECT `name`, `discord` FROM `players` WHERE `player_id` = :playerId", {
      playerId: this.receiverId
    });

    if (playerData.data.length > 0) {
      const bannerData = await Database.SendQuery("SELECT `name`, `rank`, `discord` FROM `players` WHERE `player_id` = :playerId", {
        playerId: this.issuedBy
      });

      if (bannerData.data.length > 0) {
        const updatedBan = await Database.SendQuery("UPDATE `player_bans` SET `ban_state` = :newState WHERE `id` = :banId", {
          newState: BanStates.Completed,
          banId: this.id
        });

        if (updatedBan.meta.affectedRows > 0 && updatedBan.meta.changedRows > 0) {
          this.state = BanStates.Completed;
          await server.logManager.Send(this.logger, new WebhookMessage({
            username: "Ban Logs", embeds: [{
              color: EmbedColours.Red,
              title: "__Player Automatically Unbanned__",
              description: `A players ban has expired on the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${playerData.data[0].name}\n**Reason**: ${this.banReason}\n**Banned By**: [${Ranks[bannerData.data[0].rank]}] - ${bannerData.data[0].name}\n**Banners Discord**: <@${bannerData.data[0].discord}>`,
              footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
            }]
          }));
          return true;
        }
      } else {
        Error("Ban Class", `[${sharedConfig.serverName}]: There was an issue getting your banners player data.\n\nError Code: ${ErrorCodes.NoDBPlayer}.`)
      }
    } else {
      Error("Ban Class", `[${sharedConfig.serverName}]: There was an issue getting your player data.\n\nError Code: ${ErrorCodes.NoDBPlayer}.`)
    }

    return false;
  }

}
