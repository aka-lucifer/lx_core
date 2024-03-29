import { Vector3, Font } from "fivem-js";

import {Client} from "../../client";
import {Draw3DText} from "../../utils";

import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import { Callbacks } from "../../../shared/enums/events/callbacks";

export class Scoreboard {
  private client: Client;
  private tickHandle: number = -1;

  constructor(client: Client) {
    this.client = client;

    // Opens and Closes scoreboard
    RegisterCommand("+open_scoreboard", this.OpenScoreboard.bind(this), false);
    RegisterCommand("-open_scoreboard", this.CloseScoreboard.bind(this), false);

    // Scoreboard Page Up
    // RegisterKeyMapping("+scoreboard_pageup", "Changes to next page of the scoreboard", "keyboard", "PAGEUP");
    RegisterCommand("+scoreboard_pageup", this.ScoreboardNextPage.bind(this), false);

    // Scoreboard Page Down
    // RegisterKeyMapping("+scoreboard_pagedown", "Changes to previous page of the scoreboard", "keyboard", "PAGEDOWN");
    RegisterCommand("+scoreboard_pagedown", this.ScoreboardPrevPage.bind(this), false);
  }

  // Key Mappings
  private OpenScoreboard(): void {
    if (this.tickHandle != -1) { clearTick(this.tickHandle); }
    this.client.cbManager.TriggerServerCallback(Callbacks.getScoreboardData, (returnedData: any) => {
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.OpenScoreboard,
        data: {
          maxPlayers: returnedData.maxPlayers,
          players: returnedData.recievedPlayers
        }
      }));

      this.tickHandle = setTick(this.TICK_DisplayId);
    }, {});
  }

  private CloseScoreboard(): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.CloseScoreboard
    }));
    clearTick(this.tickHandle);
  }

  private ScoreboardNextPage(): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.ChangePage,
      data: {
        value: 1
      }
    }))
  }

  private ScoreboardPrevPage(): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.ChangePage,
      data: {
        value: -1
      }
    }))
  }

  // Ticks
  private TICK_DisplayId(): void {
    const lPlayerPed = GetPlayerPed(-1);
    const lPedPos = GetEntityCoords(lPlayerPed, true);
    const players = GetActivePlayers() as Array<number>;
    for (let a = 0; a < players.length; a++) {
      const player = players[a];
      const ped = GetPlayerPed(player);
      const bone = GetPedBoneIndex(ped, GetHashKey("SKEL_Head"));
      const pos = GetPedBoneCoords(ped, bone, 0.0, 0.0, 1.2);
      const dist = GetDistanceBetweenCoords(lPedPos[0], lPedPos[1], lPedPos[2], pos[0], pos[1], pos[2], true);
      if (dist <= 25.0) {
        Draw3DText(
          new Vector3(pos[0], pos[1], pos[2]),
          {r: 67, g: 160, b: 71, a: 255},
          GetPlayerServerId(player).toString(),
          Font.ChaletLondon,
          false,
          0.4,
          true
        );
      }
    }
  }
}
