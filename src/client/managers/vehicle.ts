import {Client} from "../client";

// Controllers
// import { Speedzones } from "../controllers/vehicles/speedzones";
import {VehicleWeapon} from "../controllers/vehicles/vehWeapon";
import {AntiControl} from "../controllers/vehicles/antiControl";
import {LeaveDoorOpen} from "../controllers/vehicles/leaveDoorOpen";
import {CruiseControl} from "../controllers/vehicles/cruiseControl";
import {RepairShops} from "../controllers/vehicles/repairShops";
import {GPS} from "../controllers/vehicles/gps";
// import { KeepWheel } from "../controllers/vehicles/keepWheel";
import {Rolling} from "../controllers/vehicles/rolling";
import {Seatbelt} from "../controllers/vehicles/seatbelt";
import {ReverseBraking} from '../controllers/vehicles/reverseBraking';
import {Seating} from "../controllers/vehicles/seating";
import {Shuffling} from '../controllers/vehicles/shuffling';
import {DriveBy} from '../controllers/vehicles/driveBy';

import {LXEvents} from "../../shared/enums/events/lxEvents";
import {SystemTypes} from "../../shared/enums/ui/chat/types";
import {Events} from "../../shared/enums/events/events";
import {Message} from "../../shared/models/ui/chat/message";
import {Game, VehicleSeat} from "fivem-js";
import {Callbacks} from "../../shared/enums/events/callbacks";
import {getPedsVehSeat} from "../utils";

export class VehicleManager {
  private readonly client: Client;

  // Controllers
  // public speedZones: Speedzones;
  public weapon: VehicleWeapon;
  private antiControl: AntiControl;
  private leaveDoorOpen: LeaveDoorOpen;
  private cruiseControl: CruiseControl;
  private repairShops: RepairShops;
  public gps: GPS;
  // private keepWheel: KeepWheel;
  private rolling: Rolling;
  public seatbelt: Seatbelt;
  private reverseBraking: ReverseBraking;
  private seating: Seating;
  private shuffling: Shuffling;
  public driveBy: DriveBy;

  constructor(client: Client) {
    this.client = client;

    // Events

    // (Entering/Entered)
    onNet(LXEvents.EnteringVeh_Cl, this.EVENT_enteringVeh.bind(this));
    onNet(LXEvents.EnteredVeh_Cl, this.EVENT_enteredVeh.bind(this));

    // (Exiting/Cancelling)
    onNet(LXEvents.EnteringVehAborted_Cl, this.EVENT_enteredVehAborted.bind(this));
    onNet(LXEvents.LeftVeh_Cl, this.EVENT_leftVeh.bind(this));

    // Callbacks
    this.client.cbManager.RegisterCallback(Callbacks.getVehicleLabel, this.CALLBACK_getVehicleLabel.bind(this));
  }

  // Methods
  public init(): void {
    // this.speedZones = new Speedzones(this.client); // done (0.01ms-0.02ms)
    this.weapon = new VehicleWeapon(this.client); // done (0.01ms-0.03ms)
    this.antiControl = new AntiControl(); // done (0.02ms)
    this.leaveDoorOpen = new LeaveDoorOpen(); // done - (0.07ms)
    this.cruiseControl = new CruiseControl(); // done
    this.repairShops = new RepairShops(); // done
    this.gps = new GPS(); // done
    // this.keepWheel = new KeepWheel(); // done - (0.10ms)
    this.rolling = new Rolling(); // done
    this.seatbelt = new Seatbelt(this.client); // done - (0.10ms)
    this.reverseBraking = new ReverseBraking(); // done - (0.10ms)
    this.seating = new Seating(this.client);
    this.shuffling = new Shuffling();
    this.driveBy = new DriveBy(this.client);

    // Inits
    // this.speedZones.init(); // done (0.01ms-0.02ms)
    this.repairShops.init(); // done
    this.gps.init(); // done
    this.rolling.init(); // done
  }

  // Events
  private EVENT_enteringVeh(): void {
    if (!this.client.hud.VehStarted) this.client.hud.startVeh(); // Display vehicle HUD (If not showing)
  }

  private EVENT_enteredVeh(): void {
    const currSeat = getPedsVehSeat(Game.PlayerPed);
    // if (!this.speedZones.Started) this.speedZones.start(); // done (0.01ms-0.02ms)
    if (!this.weapon.Started) this.weapon.start(); // done (0.01ms-0.03ms)
    if (!this.antiControl.RollStarted) this.antiControl.startRoll(); // done (0.01ms)
    if (!this.antiControl.AirStarted) this.antiControl.startAir(); // done (0.01ms)
    if(!this.leaveDoorOpen.Started) this.leaveDoorOpen.start(); // done - (0.07ms)
    // if (!this.keepWheel.Started) this.keepWheel.start(); // done - (0.10ms)
    if (!this.seatbelt.Started) this.seatbelt.start(); // done - (0.10ms)
    if (!this.reverseBraking.Started) this.reverseBraking.start(); // done - (0.10ms)
    if (!this.repairShops.Started) this.repairShops.start(); // done
    if (currSeat === VehicleSeat.Passenger) if (!this.shuffling.Started) this.shuffling.start();
    if (!this.driveBy.Started) this.driveBy.start();
    if (!this.client.hud.VehStarted) this.client.hud.startVeh(); // Display vehicle HUD (If not showing)

    if (!this.client.vehicles.HasVehicles) {
      emit(Events.sendSystemMessage,
        new Message(
          `To register a vehicle to your current character, use the /vehicles command to open the UI.`,
          SystemTypes.Announcement
        )
      );
    }
  }

  private EVENT_enteredVehAborted(): void {
    if (this.client.hud.VehStarted) this.client.hud.stopVeh(); // Hide the vehicle HUD (If showing)
  }

  private EVENT_leftVeh(): void {
    // if (this.speedZones.Started) this.speedZones.stop(); // done (0.01ms-0.02ms)
    if (this.weapon.Started) this.weapon.stop(); // done (0.01ms-0.03ms)
    if (this.antiControl.RollStarted) this.antiControl.stopRoll(); // done (0.01ms)
    if (this.antiControl.AirStarted) this.antiControl.stopAir(); // done (0.01ms)
    if(this.leaveDoorOpen.Started) this.leaveDoorOpen.stop(); // done - (0.07ms)
    if (this.seatbelt.Started) this.seatbelt.stop(); // done - (0.10ms)
    if (this.reverseBraking.Started) this.reverseBraking.stop(); // done - (0.10ms)
    if (this.repairShops.Started) this.repairShops.stop(); // done
    if (this.shuffling.Started) this.shuffling.stop();
    if (this.driveBy.Started) this.driveBy.stop();
    if (this.client.hud.VehStarted) this.client.hud.stopVeh(); // Hide the vehicle HUD (If showing)
  }

  private CALLBACK_getVehicleLabel(data: any, cb: CallableFunction): void {
    const vehHandle = NetworkGetEntityFromNetworkId(data.netId);
    if (vehHandle > 0) {
      const vehModel = GetEntityModel(vehHandle);
      const displayText = GetDisplayNameFromVehicleModel(vehModel);
      cb(GetLabelText(displayText));
    }
  }
}
