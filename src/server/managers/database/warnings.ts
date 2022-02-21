import {Warning} from "../../models/database/warning";

import * as Database from "./database";
import {Server} from "../../server"

import {Log} from "../../utils"

export class WarnManager {
  public server: Server;
  private playerWarnings: Warning[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  // Get Requests
  public get GetWarnings(): Warning[] {
    return this.playerWarnings;
  }

  // Methods
  public async loadWarnings(): Promise<void> {
    const warnData = await Database.SendQuery("SELECT * FROM `player_warnings`", {});
    for (let i = 0; i < Object.keys(warnData.data).length; i++) {
      const warning = new Warning(warnData.data[i].player_id, warnData.data[i].reason, warnData.data[i].issued_by);
      warning.Id = warnData.data[i].id;
      warning.IssuedOn = new Date(warnData.data[i].issued_on);
      this.playerWarnings.push(warning);
    }

    console.log("All Player Warnings", this.playerWarnings);
  }

  public Add(warnData: Warning): number {
    const addedData = this.playerWarnings.push(warnData);
    if (this.server.IsDebugging) Log("Warn Manager | Added", `(Id: ${warnData.Id} | Player Id: ${warnData.PlayerId} | Reason: ${warnData.Reason} | Warners Id: ${!warnData.systemWarning ? warnData.Warner.Id : "System"})`);
    return addedData;
  }

  public async GetWarning(warnId: number): Promise<Warning> {
    const warnIndex = this.playerWarnings.findIndex(warning => warning.Id == warnId);
    if (warnIndex != -1) {
      return this.playerWarnings[warnIndex];
    }
  }

  public async getPlayerWarnings(playerId: number): Promise<Warning[]> {
    const playerWarnings = [];

    for (let i = 0; i < this.playerWarnings.length; i++) {
      if (this.playerWarnings[i].PlayerId == playerId) {
        playerWarnings.push(this.playerWarnings[i]);
      }
    }

    return playerWarnings;
  }
}