import {Game, Ped} from "fivem-js";

import {Client} from "../../client";
import {Delay, GetHash} from "../../utils";

// Controllers
import { Minimap } from '../../controllers/ui/minimap';

import clientConfig from "../../../configs/client.json";

export class WorldManager {
  private client: Client;
  private clearerTick: number = undefined;
  private slowTick: number = undefined;

  // Controllers
  public minimap: Minimap;

  constructor(client: Client) {
    this.client = client;

    // Controllers
    this.minimap = new Minimap();
  }

  // Methods
  public async init(): Promise<void> {
    this.minimap.init();

    const pickups = clientConfig.world.weaponPickups;

    // Enable persistent flashlight
    SetFlashLightKeepOnWhileMoving(true);

    // Disable default EMS & Fire
    for (let i = 0; i < 30; i++) {
      EnableDispatchService(i, false);
    }

    // Disable World Pickups
    for (let i = 0; i < pickups.length; i++) {
      ToggleUsePickupsForPlayer(Game.PlayerPed.Handle, GetHash(pickups[i]), false);
    }

    this.clearerTick = setTick(async() => {
      const myPed = Game.PlayerPed;

      this.disableIdleCam();
      this.disablePolice(myPed);
      this.disablePVP(myPed);
      this.disableVehRewards(myPed);
      this.disableHealthRecharge();
      this.wipeInteriors();

      await Delay(500);
    });

    this.slowTick = setTick(async() => {
      this.disableAmbients();
      this.disableCoverAdvantage();

      await Delay(2000);
    });
  }

  // Disable Wondering Idle Cam (Don't call every frame, as it activates every 30 seconds)
  private disableIdleCam(): void {
    InvalidateIdleCam();
  }

  // Disable Police Radio, Vehicle & Vehicle Rewards
  private disablePolice(ped: Ped): void {
    const myCoords = ped.Position;

    // Disable Police Radio
    CancelCurrentPoliceReport();

    // Deletes Police Vehicles
    ClearAreaOfCops(myCoords.x, myCoords.y, myCoords.z, 400.0, 0);

    // Police Vehicle Rewards
    DisablePlayerVehicleRewards(ped.Handle);
  }

  // Disable PVP
  private disablePVP(ped: Ped): void {
    // if (!this.client.safezoneManager.inSafezone) {
    //   SetCanAttackFriendly(ped.Handle, true, true);
    //   SetPedSuffersCriticalHits(ped.Handle, false);
    //   NetworkSetFriendlyFireOption(true);
    // }

    if (IsPedBeingStunned(ped.Handle, 0)) {
      SetPedMinGroundTimeForStungun(ped.Handle, clientConfig.world.stunTimer * 1000);
    }
  }

  // Police Vehicle Rewards
  private disableVehRewards(ped: Ped): void {
    DisablePlayerVehicleRewards(ped.Handle);
  }

  // Disable Health Recharge
  private disableHealthRecharge() {
    SetPlayerHealthRechargeMultiplier(PlayerId(), 0);
  }

  // Disable Interior Peds
  private wipeInteriors(): void {
    const mlos = clientConfig.world.mloPedClearers;
    for (let i = 0; i < mlos.length; i++) {
      ClearAreaOfPeds(mlos[i].x, mlos[i].y, mlos[i].z, mlos[i].radius, 1);
    }
  }

  // Disable Ambients
  private disableAmbients(): void {
    // Disable Ambient Sirens
    DistantCopCarSirens(false);

    // Disable ambient trains
    DeleteAllTrains();
    
    // Disable train (on track) spawning
    for (let i = 0; i < 15; i++) {
      SwitchTrainTrack(i, false);
    }

    // Disable spawning of trains
    SetRandomTrains(false);
  }

  // Disable PVP Cover Exploit
  private disableCoverAdvantage(): void {
    const myPlayer = Game.Player;
    const roomKey = GetRoomKeyFromEntity(Game.PlayerPed.Handle);

    if (roomKey !== 0) {
      SetPlayerCanUseCover(myPlayer.Handle, false); // Disable cover when inside an interior
    } else {
      SetPlayerCanUseCover(myPlayer.Handle, true); // Enable cover when inside an interior
    }
  }
}
