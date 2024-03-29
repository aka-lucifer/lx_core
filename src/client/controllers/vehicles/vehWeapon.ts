import { Bone, Game, Model, Prop, World } from "fivem-js";

import { Client } from '../../client';
import { Delay, Inform } from "../../utils";

import {AmmoType, Weapons} from "../../../shared/enums/weapons";

import sharedConfig from "../../../configs/shared.json";

export class VehicleWeapon {
  private client: Client;

  private currentWeapon: number;
  private attachedWeaponHash: number;
  private attachedWeapon: Prop;
  private hasAttached: boolean = false;
  private visible: boolean = true;

  // Ticks
  private propTick: number = undefined;

  constructor(client: Client) {
    this.client = client;
    this.currentWeapon = Weapons.Unarmed;

    Inform("Vehicle | Weapon Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.propTick !== undefined;
  }

  // Methods
  public async changedWeapon(newWeapon: number): Promise<void> {
    this.currentWeapon = newWeapon;
  }

  public stop(): void {
    console.log("stop veh weapon prop!");
    if (this.propTick !== undefined) {
      clearTick(this.propTick);
      this.propTick = undefined;
      if (this.attachedWeapon != null && this.attachedWeapon.exists()) {
        this.attachedWeapon.delete();
        this.attachedWeapon = undefined;
      }
      this.hasAttached = false;
    }
  }

  public start(): void {
    console.log("start veh weapon prop!");
    const myPed = Game.PlayerPed;

    if (this.propTick === undefined) this.propTick = setTick(async() => {
      if (!this.hasAttached) {
        if (this.currentWeapon != Weapons.Unarmed) {
          const ammoType = GetPedAmmoTypeFromWeapon(myPed.Handle, this.currentWeapon);
          if (
            ammoType === AmmoType.Pistol ||
            ammoType === AmmoType.PistolMk2FMJAmmo ||
            ammoType === AmmoType.PistolMk2HPAmmo ||
            ammoType === AmmoType.PistolMk2TracerAmmo ||
            ammoType === AmmoType.FlareGun ||
            ammoType === AmmoType.StunGun ||
            ammoType === AmmoType.SMG ||
            ammoType === AmmoType.SMGMk2FMJAmmo ||
            ammoType === AmmoType.SMGMk2HPAmmo ||
            ammoType === AmmoType.SMGMk2TracerAmmo
          ) {
            const currWeapData = sharedConfig.weapons[this.currentWeapon];
            if (currWeapData) {
              if (currWeapData.type == "weapon") {
                const weaponModel = new Model(currWeapData.attaching.model);
                const loadedModel = await weaponModel.request(2000);

                if (loadedModel) {
                  this.attachedWeaponHash = this.currentWeapon;
                  this.attachedWeapon = await World.createProp(weaponModel, myPed.Position, false, false);


                  // const rightHandVeh = await rightHandVehicle(currVeh);
                  // const boneToAttach = !rightHandVeh ? Bone.SKEL_R_Hand : Bone.SKEL_L_Hand;
                  // console.log("vehs 1", rightHandVeh, boneToAttach);
                  const boneToAttach = Bone.SKEL_R_Hand

                  AttachEntityToEntity(this.attachedWeapon.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, boneToAttach), 0.18, 0.035, -0.001, -82.2, -2.6449, -7.71, true, true, false, false, 1, true)
                  this.hasAttached = true;
                } else {
                  // console.log("model not loaded 1, it timed out!");
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
        } else {
          await Delay(500);
        }
      } else {
        if (this.attachedWeaponHash !== this.currentWeapon) {

          // Delete current attached weapon
          this.attachedWeapon.delete();
          this.attachedWeaponHash = undefined;
          this.attachedWeapon = undefined;
          this.hasAttached = false;
          
          // If our new weapon isn't unarmed
          if (this.currentWeapon !== Weapons.Unarmed) {
            // console.log("not unarmed")
            const ammoType = GetPedAmmoTypeFromWeapon(myPed.Handle, this.currentWeapon);
            if (
              ammoType === AmmoType.Pistol ||
              ammoType === AmmoType.PistolMk2FMJAmmo ||
              ammoType === AmmoType.PistolMk2HPAmmo ||
              ammoType === AmmoType.PistolMk2TracerAmmo ||
              ammoType === AmmoType.FlareGun ||
              ammoType === AmmoType.StunGun ||
              ammoType === AmmoType.SMG ||
              ammoType === AmmoType.SMGMk2FMJAmmo ||
              ammoType === AmmoType.SMGMk2HPAmmo ||
              ammoType === AmmoType.SMGMk2TracerAmmo
            ) {
              const currWeapData = sharedConfig.weapons[this.currentWeapon];
              if (currWeapData) {
                if (currWeapData.type == "weapon") {
                  // console.log("create model", currWeapData.attaching);
                  const weaponModel = new Model(currWeapData.attaching.model);
                  const loadedModel = await weaponModel.request(2000);

                  if (loadedModel) {
                    this.attachedWeaponHash = this.currentWeapon;
                    this.attachedWeapon = await World.createProp(weaponModel, myPed.Position, false, false);

                    // const rightHandVeh = await rightHandVehicle(currVeh);
                    // const boneToAttach = !rightHandVeh ? Bone.SKEL_R_Hand : Bone.SKEL_L_Hand;
                    // console.log("vehs 2", rightHandVeh, boneToAttach);
                    const boneToAttach = Bone.SKEL_R_Hand

                    AttachEntityToEntity(this.attachedWeapon.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, boneToAttach), 0.18, 0.035, -0.001, -82.2, -2.6449, -7.71, true, true, false, false, 1, true)
                    // this.attachedWeapon.attachToBone(new EntityBone(myPed, GetPedBoneIndex(myPed.Handle, Bone.SKEL_R_Hand)), new Vector3(0.18, 0.035, -0.001), new Vector3(-82.2, -2.6449, -7.71));
                    this.hasAttached = true;
                  } else {
                    // console.log("model not loaded 2, it timed out!");
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
          }
        }
      }

      if (IsPlayerFreeAiming(Game.Player.Handle) && this.client.vehicleManager.driveBy.Can) {
        if (this.visible) {
          if (this.attachedWeapon !== undefined) {
            this.attachedWeapon.IsVisible = false;
            this.visible = false;
          } else {
            console.log("weapon model isn't attached!");
          }
        } else {
          await Delay(500);
        }
      } else {
        if (!this.visible) {
          if (this.attachedWeapon !== undefined) {
            await Delay(100);
            this.attachedWeapon.IsVisible = true;
            this.visible = true;
          } else {
            console.log("weapon model isn't attached!");
          }
        } else {
          await Delay(500);
        }
      }
    });
  }
}
