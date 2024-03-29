import { Game, Prop } from "fivem-js";

import { Client } from "../../client";
import { GetHash, Inform } from "../../utils";

import { LXEvents } from "../../../shared/enums/events/lxEvents";
import { AddonWeapons, Weapons, AmmoType } from "../../../shared/enums/weapons";

import clientConfig from "../../../configs/client.json";
import { Ranks } from '../../../shared/enums/ranks';

export class WeaponRecoil {
  private client: Client;

  // Weapon Data
  private currentWeapon: number;
  private ammoType: number;
  private weapon: Prop;

  // Recoil Data
  private baseRecoil: number;
  private shortGunsMult: number;
  private longGunsMult: number;
  private pistolAmmoRecoil: number;
  private smgAmmoRecoil: number;
  private lmgAmmoRecoil: number;
  private rifleAmmoRecoil: number;
  private sniperAmmoRecoil: number;
  private shotgunAmmoRecoil: number;
  private gripSubtractor: number;
  private silencerSubtractor: number;
  private crouchSubractor: number;
  private tickHandler: number;
  private currentRecoil: number = 0;
  private vehRecoil: number;
  private hipFireRecoil: number;

  constructor(client: Client) {
    this.client = client;
    
    // Events
    onNet(LXEvents.Gunshot_Cl, this.gunshot.bind(this));
    
    Inform("Weapon | Recoil Controller", "Started!");
  }

  // Methods
  private loadSettings(): void {
    this.baseRecoil = clientConfig.controllers.weapons.recoil.baseRecoil;
    this.shortGunsMult = clientConfig.controllers.weapons.recoil.shortGunsMult;
    this.longGunsMult = clientConfig.controllers.weapons.recoil.longGunsMult;
    this.pistolAmmoRecoil = clientConfig.controllers.weapons.recoil.pistolAmmoRecoil;
    this.smgAmmoRecoil = clientConfig.controllers.weapons.recoil.smgAmmoRecoil;
    this.lmgAmmoRecoil = clientConfig.controllers.weapons.recoil.lmgAmmoRecoil;
    this.sniperAmmoRecoil = clientConfig.controllers.weapons.recoil.sniperAmmoRecoil;
    this.rifleAmmoRecoil = clientConfig.controllers.weapons.recoil.rifleAmmoRecoil;
    this.shotgunAmmoRecoil = clientConfig.controllers.weapons.recoil.shotgunAmmoRecoil;
    this.silencerSubtractor = clientConfig.controllers.weapons.recoil.silencerSubtractor;
    this.gripSubtractor = clientConfig.controllers.weapons.recoil.gripSubtractor;
    this.crouchSubractor = clientConfig.controllers.weapons.recoil.crouchSubtractor;
    this.longGunsMult = clientConfig.controllers.weapons.recoil.longGunsMult;
    this.vehRecoil = clientConfig.controllers.weapons.recoil.vehRecoil;
    this.hipFireRecoil = clientConfig.controllers.weapons.recoil.hipFireRecoil;
  }

  public init(): void {
    this.loadSettings();
  }

  // Events
  private async gunshot(): Promise<void> {
    const noRecoil = this.client.Player.Rank >= Ranks.Admin ? this.client.staffManager.staffMenu.NoRecoil : false; // Determines if no recoil should be applied or not.

    if (!noRecoil) {
      this.currentRecoil = 0;
      this.currentWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle); // Update our current weapon variable

      // if we aren't unarmed
      if (this.currentWeapon != Weapons.Unarmed && this.currentWeapon != AddonWeapons.GravityGun) {
        // If our gun shoots bullets
        if (GetWeaponDamageType(this.currentWeapon) == 3) {
          const myPed = Game.PlayerPed;
          this.ammoType = GetPedAmmoType(myPed.Handle, this.currentWeapon);
          this.weapon = new Prop(GetCurrentPedWeaponEntityIndex(myPed.Handle));

          // console.log(`Weapon: ${this.currentWeapon} | Object: ${this.weapon.Handle} | Ammo Type: ${this.ammoType} | Default Recoil: ${this.baseRecoil} | Wind Speed: ${GetWindSpeed()} | Wind Direction: ${GetWindDirection()}`);

          if (this.ammoType === AmmoType.Pistol || this.ammoType === AmmoType.PistolMk2FMJAmmo || this.ammoType === AmmoType.PistolMk2HPAmmo || this.ammoType === AmmoType.PistolMk2TracerAmmo) {
            this.currentRecoil = this.pistolAmmoRecoil;
          } else if (this.ammoType === AmmoType.SMG || this.ammoType === AmmoType.SMGMk2FMJAmmo || this.ammoType === AmmoType.SMGMk2HPAmmo || this.ammoType === AmmoType.SMGMk2TracerAmmo) {
            this.currentRecoil = this.smgAmmoRecoil;
          } else if (this.ammoType === AmmoType.MG) {
            this.currentRecoil = this.lmgAmmoRecoil;
          } else if (this.ammoType === AmmoType.AssaultRifle || this.ammoType === AmmoType.RifleMk2APAmmo || this.ammoType === AmmoType.RifleMk2FMJAmmo || this.ammoType === AmmoType.RifleMk2TracerAmmo) {
            this.currentRecoil = this.rifleAmmoRecoil;
          } else if (this.ammoType === AmmoType.Sniper || this.ammoType === AmmoType.SniperMk2APAmmo || this.ammoType === AmmoType.SniperMk2FMJAmmo) {
            this.currentRecoil = this.sniperAmmoRecoil;
          } else if (this.ammoType === AmmoType.Shotgun || this.ammoType === AmmoType.ShotgunMk2SBShells || this.ammoType === AmmoType.ShotgunMk2FSheels) {
            this.currentRecoil = this.shotgunAmmoRecoil;
          }

          if (this.currentRecoil > 0) {
            this.currentRecoil = this.baseRecoil + this.currentRecoil;
            // if (this.client.IsDebugging) console.log(`Stage 1 Recoil: ${this.currentRecoil}`);

            const weapDimensions = GetModelDimensions(GetEntityModel(this.weapon.Handle));
            const modelLength = Math.abs(weapDimensions[0][1])
            if (modelLength > 0.05) { // Y Coord
              this.currentRecoil = this.currentRecoil * this.longGunsMult;
              // if (this.client.IsDebugging) console.log("Using Long Gun");
            } else if (modelLength > 0.02) {
              // if (this.client.IsDebugging) console.log("Using Normal Gun");
            } else {
              this.currentRecoil = this.currentRecoil * this.shortGunsMult;
              // if (this.client.IsDebugging) console.log("Using Short Gun");
            }

            if (IsPedCurrentWeaponSilenced(myPed.Handle)) {
              this.currentRecoil = this.currentRecoil - this.silencerSubtractor;
              // if (this.client.IsDebugging) console.log(`Silenced Recoil: ${this.silencerSubtractor} = ${this.currentRecoil}`);
            }

            if (HasPedGotWeaponComponent(myPed.Handle, this.currentWeapon, GetHash("COMPONENT_AT_AR_AFGRIP")) || HasPedGotWeaponComponent(myPed.Handle, this.currentWeapon, GetHash("COMPONENT_AT_AR_AFGRIP_02"))) {
              this.currentRecoil = this.currentRecoil - this.gripSubtractor;
              // if (this.client.IsDebugging) console.log(`Grip Recoil: ${this.gripSubtractor} = ${this.currentRecoil}`);
            }

            if (myPed.IsInStealthMode) { // Change this when crouch is properly done
              this.currentRecoil = this.currentRecoil - this.crouchSubractor;
            }

            if (IsPedInAnyVehicle(myPed.Handle, false)) {
              this.currentRecoil = this.currentRecoil + 1; // Fix veh height shooting below
              this.currentRecoil = this.currentRecoil + this.vehRecoil;
            } else {
              if (!IsPlayerFreeAiming(Game.Player.Handle)) {
                this.currentRecoil = this.currentRecoil + this.hipFireRecoil;
              }
            }

            // const windDirection = GetWindDirection();
            // const windSpeed = GetWindSpeed();

            // if (this.client.IsDebugging) console.log(`Final Recoil: ${this.currentRecoil}`)
            // if (this.client.IsDebugging) console.log(`Cam Pitch: ${GetGameplayCamRelativePitch()}`)
            // console.log(`Wind Data - Speed: ${windSpeed} | Direction: ${windDirection}`);
            // if (this.ammoType == AmmoType.Sniper) SetGameplayCamRelativeHeading(GetGameplayCamRelativeHeading() + (windSpeed / 4));
            SetGameplayCamRelativePitch(GetGameplayCamRelativePitch() + this.currentRecoil, 1.0);

            // If health is too low, recieve damage from the recoil to your player
            if (Game.PlayerPed.Health <= 5) {
              Game.PlayerPed.applyDamage(2);
              Inform("Recoil Manager", "Applied damage as you fire a weapon with very low health!");
            }
          }
        }
      }
    }
  }
}
