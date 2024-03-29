import { AmmoType, Game } from 'fivem-js';

import { Capitalize, keyboardInput } from '../utils';
import { Client } from '../client';

import { Notification } from '../models/ui/notification';

// Jobs
import { PoliceJob } from '../controllers/jobs/policeJob';
import { CommunityJob } from '../controllers/jobs/communityJob';

// Controllers
import { JobBlips } from '../controllers/jobs/features/jobBlips';

import { JobEvents } from '../../shared/enums/events/jobs/jobEvents';
import { JobCallbacks } from '../../shared/enums/events/jobs/jobCallbacks';
import { NotificationTypes } from '../../shared/enums/ui/notifications/types';
import { Jobs } from '../../shared/enums/jobs/jobs';
import { Events } from '../../shared/enums/events/events';
import { Message } from '../../shared/models/ui/chat/message';
import { SystemTypes } from '../../shared/enums/ui/chat/types';
import { Weapons } from '../../shared/enums/weapons';
import { Ranks } from '../../shared/enums/ranks';

let newCallsign;

export class JobManager {
  private readonly client: Client;

  // Jobs
  public policeJob: PoliceJob;
  public communityJob: CommunityJob;

  // Controllers
  private jobBlips: JobBlips;

  // Other
  private sentActiveNotify: boolean = false;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(JobEvents.toggleDuty, this.EVENT_toggleDuty.bind(this));
    onNet(JobEvents.setCallsign, this.EVENT_setCallsign.bind(this));
    onNet(JobEvents.dutyStateChange, this.EVENT_dutyStateChange.bind(this));
  }

  // Methods
  public async init(): Promise<void> {
    this.policeJob = new PoliceJob(this.client);

    // Job Initiators
    await this.policeJob.init();

    if (this.client.Character.job.name === Jobs.Community) {
      this.communityJob = new CommunityJob(this.client);

      // Job Initiators
      await this.communityJob.init();

      // Job Methods
      this.communityJob.createMenu();
    }

    // Controllers
    this.jobBlips = new JobBlips(this.client);
  }

  // Events
  public async EVENT_toggleDuty(data: Record<string, any>): Promise<void> {
    if (this.client.Character.Job.callsign !== "NOT_SET") {
      console.log("tog duty", this.client.Character.Job.status, data.state, JSON.stringify(data));
      if (this.client.Character.Job.status !== data.state) {

        this.client.cbManager.TriggerServerCallback(JobCallbacks.setDuty, async(returnedState: boolean) => {
          this.client.Character.Job.status = returnedState;

          if (this.client.staffManager.staffMenu !== undefined) {
            if (this.client.player.Rank >= Ranks.Admin) this.client.staffManager.staffMenu.Duty = returnedState;
          }

          console.log("Set Duty", Capitalize(this.client.Character.Job.status.toString()));

          if (returnedState) {
            if (this.client.Character.isLeoJob()) {
              const myPed = Game.PlayerPed;

              global.exports["pma-voice"].setVoiceProperty("radioEnabled", true);
              global.exports["pma-voice"].setRadioChannel(245.1, "LEO (Main RTO)");

              // // Apply Weapons & Armour
              if (!HasPedGotWeapon(myPed.Handle, Weapons.AR15, false)) {
                const [_1, arAmmo] = GetMaxAmmoByType(myPed.Handle, AmmoType.AssaultRifle);
                myPed.giveWeapon(Weapons.AR15, arAmmo, false, false);
              }

              if (!HasPedGotWeapon(myPed.Handle, Weapons.Remington870, false)) {
                const [_1, shotgunAmmo] = GetMaxAmmoByType(myPed.Handle, AmmoType.AssaultRifle);
                myPed.giveWeapon(Weapons.Remington870, shotgunAmmo, false, false);
              }

              if (!HasPedGotWeapon(myPed.Handle, Weapons.Glock17, false)) {
                const [_2, pistolAmmo] = GetMaxAmmoByType(myPed.Handle, AmmoType.Pistol);
                myPed.giveWeapon(Weapons.Glock17, pistolAmmo, false, false);
              }

              if (!HasPedGotWeapon(myPed.Handle, Weapons.X26Tazer, false)) {
                myPed.giveWeapon(Weapons.X26Tazer, 0, false, false);
              }

              if (!HasPedGotWeapon(myPed.Handle, Weapons.Nightstick, false)) {
                myPed.giveWeapon(Weapons.Nightstick, 0, false, false);
              }

              SetPedArmour(myPed.Handle, 100);
            }
          } else {
            if (this.client.Character.isLeoJob()) {
              const myPed = Game.PlayerPed;

              global.exports["pma-voice"].setVoiceProperty("radioEnabled", false);
              global.exports["pma-voice"].setRadioChannel(0);

              if (HasPedGotWeapon(myPed.Handle, Weapons.AR15, false)) {
                myPed.removeWeapon(Weapons.AR15);
              }

              if (HasPedGotWeapon(myPed.Handle, Weapons.Glock17, false)) {
                myPed.removeWeapon(Weapons.Glock17);
              }

              if (HasPedGotWeapon(myPed.Handle, Weapons.Nightstick, false)) {
                myPed.removeWeapon(Weapons.Nightstick);
              }

              if (GetPedArmour(myPed.Handle) > 0) {
                SetPedArmour(myPed.Handle, 100);
              }
            }
          }
        }, data.state);
      } else {
        if (data.state) {
          const notify = new Notification("Job", `You are already on duty`, NotificationTypes.Error);
          await notify.send();
        } else {
          const notify = new Notification("Job", `You are already off duty`, NotificationTypes.Error);
          await notify.send();
        }
      }
    } else {
      const notify = new Notification("Job", `You have to set your callsign before you go on duty!`, NotificationTypes.Error, 5000);
      await notify.send();
    }
  }

  public async EVENT_setCallsign(): Promise<void> {
    newCallsign = await keyboardInput("Callsign", 5);
    if (newCallsign !== undefined && newCallsign !== null) {
      if (newCallsign.length > 0) {
        const tempCallsign = newCallsign;
        this.client.cbManager.TriggerServerCallback(JobCallbacks.updateCallsign, async(returnedState: boolean) => {
          if (returnedState) {
            this.client.Character.Job.callsign = newCallsign;
            const notify = new Notification("Job", `You've set your callsign to (${newCallsign})`, NotificationTypes.Success);
            await notify.send();
          } else {
            const notify = new Notification("Job", `There was an error updating your callsign!`, NotificationTypes.Error);
            await notify.send();
          }
        }, newCallsign);
      } else {
        const notify = new Notification("Job", `You haven't entered a callsign!`, NotificationTypes.Error);
        await notify.send();
      }
    } else {
      const notify = new Notification("Job", `You haven't entered a callsign!`, NotificationTypes.Error);
      await notify.send();
    }
  }

  private EVENT_dutyStateChange(newState: boolean): void {
    this.policeJob.commandMenu.toggleBlips(newState);
    this.policeJob.garages.toggleBlips(newState);

    if (newState) { // If on duty
      this.client.hexMenu.addPoliceOptions(); // Add police options to the hex menu
      this.policeJob.commandMenu.start();
      this.policeJob.garages.start();

      if (!this.sentActiveNotify) {
        this.sentActiveNotify = true;
        emit(Events.sendSystemMessage,
          new Message(
            `Make sure to use the /active command to go 10-7/10-8.`,
            SystemTypes.Announcement
          )
        );
      }
    } else { // If off duty
      this.client.hexMenu.removePoliceOptions(); // Remove police options from the hex menu
      this.policeJob.commandMenu.stop();
      this.policeJob.garages.stop();
    }
  }
}
