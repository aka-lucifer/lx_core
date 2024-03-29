import { Audio, Scaleform } from "fivem-js";

import { Client } from "../../client";

import { Menu } from "../../models/ui/menu/menu";
import { Submenu } from "../../models/ui/menu/submenu";

import { Inform, Capitalize } from "../../utils";

import { MenuPositions } from "../../../shared/enums/ui/menu/positions";
import { Events } from "../../../shared/enums/events/events";

import { Ranks } from "../../../shared/enums/ranks";
import { NuiMessages } from '../../../shared/enums/ui/nuiMessages';
import { Callbacks } from '../../../shared/enums/events/callbacks';

import sharedConfig from "../../../configs/shared.json";

export interface AOPLayout {
  name: string,
  automaticCycling: boolean,
  playerMax?: number,
  positions: {x: number, y: number, z: number, heading: number}[]
}

enum AOPStates {
  None,
  Updated,
  Automatic
}

export class AOPManager {
  private client: Client;

  // Menu Data
  private aopMenu: Menu;
  private aopChangerMenu: Submenu;
  private aopCyclingCheckbox: string;

  // AOP Data
  private aopCycling: boolean;
  private currentAOP: AOPLayout;

  // AOP Scaleform
  private aopScaleform: Scaleform;
  private scaleformTick: number = undefined;
  private scaleformTimeout: NodeJS.Timeout = undefined;
  
  constructor(client: Client) {
    this.client = client;
    
    // Set AOP cycling convar into boolean variable
    this.aopCycling = (GetConvar('player_based_aop', 'false') === "true");

    // Events
    onNet(Events.syncAOP, this.EVENT_syncAOP.bind(this));
    onNet(Events.syncAOPCycling, this.EVENT_syncAOPCycling.bind(this));
    onNet(Events.aopMenu, this.EVENT_aopMenu.bind(this));
  }

  // Getters
  public get AOP(): AOPLayout {
    return this.currentAOP;
  }

  // Methods
  public init(): void {
    this.aopMenu = new Menu("AOP Selector", GetCurrentResourceName(), MenuPositions.MiddleLeft);
    this.aopChangerMenu = new Submenu("Change AOP", this.aopMenu.resource, this.aopMenu.handle, this.aopMenu.position);

    for (let i = 0; i < sharedConfig.aop.locations.length; i++) {
      this.aopChangerMenu.BindButton(sharedConfig.aop.locations[i].name, () => {
        this.client.cbManager.TriggerServerCallback(Callbacks.setAOP, (returnedData: any) => {
          if (returnedData) {
            this.aopCycling = false;
            this.client.menuManager.UpdateState(this.aopCyclingCheckbox, false);
          }
        }, sharedConfig.aop.locations[i]);
      })
    }

    this.aopCyclingCheckbox = this.aopMenu.BindCheckbox(`Player Based AOP`, this.aopCycling, (newState: boolean) => {
      if (newState != this.aopCycling) {
        emitNet(Events.setCycling, newState);
      }
    });
  }

  // Events
  public async EVENT_syncAOP(newAOP: AOPLayout, aopState: AOPStates = AOPStates.Automatic): Promise<void> {
    this.currentAOP = newAOP;

    Inform("AOP Updated", `New AOP: ${this.currentAOP.name}`);

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.UpdateAOP,
      data: {
        newAOP: this.currentAOP.name
      }
    }));

    if (aopState === AOPStates.Automatic || aopState === AOPStates.Updated) {
      this.aopScaleform = new Scaleform("MIDSIZED_MESSAGE");
      const loadedScaleform = await this.aopScaleform.load();
      if (loadedScaleform) {
        this.aopScaleform.callFunction("SHOW_COND_SHARD_MESSAGE", "~y~AOP Change", `The Area of Patrol has changed to ~y~${this.currentAOP.name}~w~!`, 2);
        Audio.playSoundFrontEnd("CHECKPOINT_PERFECT", "HUD_MINI_GAME_SOUNDSET");

        if (this.scaleformTick == undefined) this.scaleformTick = setTick(async() => {
          await this.aopScaleform.render2D();
        })

        if (this.scaleformTimeout === undefined) {
          this.scaleformTimeout = setTimeout(() => {
            if (this.scaleformTick != undefined) {
              clearTick(this.scaleformTick);
              this.scaleformTick = undefined;
            }
          }, 5000);
        } else {
          clearTimeout(this.scaleformTimeout);
          this.scaleformTimeout = setTimeout(() => {
            if (this.scaleformTick != undefined) {
              clearTick(this.scaleformTick);
              this.scaleformTick = undefined;
            }
          }, 5000);
        }
      }
    }
  }

  public EVENT_syncAOPCycling(aopCycling: boolean): void {
    this.aopCycling = aopCycling;

    Inform("AOP Updated", ` AOP Cycling Set To (${Capitalize(this.aopCycling.toString())})`);
  }

  public async EVENT_aopMenu(): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      await this.aopMenu.Open();
    }
  }
}
