import {Control, Game, InputMode, Screen, VehicleSeat} from 'fivem-js';

import {Delay, Inform} from '../../utils';

export class Shuffling {
  private shufflingDisabled: boolean = false;
  private sentNotify: boolean = false;
  private tick: number = undefined;

  constructor() {
    Inform("Vehicle | Shuffling Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.tick !== undefined;
  }

  // Methods
  public start(): void {
    if (this.tick === undefined) this.tick = setTick(async() => {
      if (!this.shufflingDisabled) {
        const myPed = Game.PlayerPed;
        if (IsPedInAnyVehicle(myPed.Handle, false)) {
          const currVeh = myPed.CurrentVehicle;
          if (!currVeh.Model.IsBike && !currVeh.Model.IsBicycle && !currVeh.Model.IsQuadbike) {
            if (GetPedInVehicleSeat(currVeh.Handle, VehicleSeat.Passenger) === myPed.Handle) {
              if (!GetIsTaskActive(myPed.Handle, 164) && GetIsTaskActive(myPed.Handle, 165)) {
                myPed.setIntoVehicle(currVeh, VehicleSeat.Passenger);
              }

              if (!this.sentNotify) {
                this.sentNotify = true;
                if (currVeh.Driver.Handle === 0) {
                  Screen.displayHelpTextThisFrame("~INPUT_CONTEXT~ Shuffle Seat");
                }
              }

              if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Context) || Game.isDisabledControlJustPressed(InputMode.MouseAndKeyboard, Control.Context)) {
                this.shufflingDisabled = true;

                // Wait until you're in the driver seat
                while (currVeh.getPedOnSeat(VehicleSeat.Driver).Handle !== myPed.Handle) {
                  await Delay(100);
                }

                this.shufflingDisabled = false;
              }
            } else {
              await Delay(500);
            }
          } else {
            await Delay(500);
          }
        } else {
          await Delay(500);
        }
      } else {
        await Delay(500);
      }
    });
  }

  public stop(): void {
    if (this.tick !== undefined) {
      clearTick(this.tick);
      this.tick = undefined;
    }
  }
}
