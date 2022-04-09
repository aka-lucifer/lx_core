import {Entity, Game, Vehicle, VehicleSeat, World} from "fivem-js"

import { svPlayer } from "./models/player";
import {Notification} from "./models/ui/notification";
import { Character } from "./models/character";
import { Progress } from "./models/ui/progress";

// [Managers] Client Data
import {RichPresence} from "./managers/richPresence";
import {StaffManager} from "./managers/staff";

// [Managers] World
import {WorldManager} from "./managers/world/world";
import { SafezoneManager } from "./managers/world/safezones";

// [Managers] Syncing
import {TimeManager} from "./managers/sync/time";
import {WeatherManager} from "./managers/sync/weather";
import { AOPManager } from "./managers/sync/aop";

// [Managers] Callbacks
import {ServerCallbackManager} from "./managers/serverCallbacks";

// [Managers] UI
import {Spawner} from "./managers/ui/spawner";
import {Characters} from "./managers/ui/characters";
import {Vehicles} from "./managers/ui/vehicles";
import {ChatManager} from "./managers/ui/chat";
import {Scoreboard} from "./managers/ui/scoreboard";
import {Warnings} from "./managers/ui/warnings";
import {Commends} from "./managers/ui/commends";
import { MenuManager } from "./managers/ui/menu";

// [Managers] Job
import { JobManager } from "./managers/job";

// [Managers] Vehicle
import { VehicleManager } from "./managers/vehicle";

// [Controllers] Police
// import {CuffingStuff} from "./controllers/jobs/police/cuffing";
// import {HelicamManager} from "./controllers/jobs/police/helicam";
import { Grabbing } from "./controllers/jobs/police/grabbing";

// [Controllers] Weapon
import { WeaponRemovers } from "./controllers/weapons/removers";
import { Disarmer } from "./controllers/weapons/disarmer";
import { Reloading } from "./controllers/weapons/reloading";
import { WeaponModes } from "./controllers/weapons/modes";
import { SpamPreventor } from "./controllers/weapons/spamPreventor";
import { WeaponRecoil } from "./controllers/weapons/recoil";
import { WeaponDisablers } from "./controllers/weapons/disablers";

// [Controllers] Normal
import { PlayerNames } from "./controllers/playerNames";
import { AFK } from "./controllers/afk";

import {Delay, Inform, NumToVector3, RegisterNuiCallback, teleportToCoords} from "./utils";

// Shared
import {Events} from "../shared/enums/events/events";
import {GameEvents} from "../shared/enums/events/gameEvents";
import {Callbacks} from "../shared/enums/events/callbacks";
import {Weapons} from "../shared/enums/weapons";
import {NuiMessages} from "../shared/enums/ui/nuiMessages";
import { Message } from "../shared/models/ui/chat/message";
import { SystemTypes } from "../shared/enums/ui/chat/types";
import {NotificationTypes} from "../shared/enums/ui/notifications/types";
import { NuiCallbacks } from "../shared/enums/ui/nuiCallbacks";

import clientConfig from "../configs/client.json";
import sharedConfig from "../configs/shared.json";

let takingScreenshot = false;

export class Client {
// Client Data
  private debugging: boolean;
  private initialSpawn: boolean;
  private developmentMode: boolean = false;
  private players: svPlayer[] = [];
  private richPresenceData: Record<string, any>;
  private nuiReady: boolean = false;
  private started: boolean = false;
  private usingKeyboard: boolean = false;

  // Player Data
  private statesTick: number = undefined;
  public playerStates: EntityInterface;
  
  public player: svPlayer;
  public character: Character;

  // [Managers]
  private richPresence: RichPresence;
  private staffManager: StaffManager;

  // [Managers] World
  private worldManager: WorldManager;
  public safezoneManager: SafezoneManager;

  // [Managers] Syncing
  private timeManager: TimeManager;
  private weatherManager: WeatherManager;
  public aopManager: AOPManager;

  // [Managers] Callbacks
  public serverCallbackManager: ServerCallbackManager;

  // [Managers] UI
  private spawner: Spawner;
  public characters: Characters;
  public vehicles: Vehicles;
  private chatManager: ChatManager;
  private scoreboard: Scoreboard;
  private warnings: Warnings;
  private commends: Commends;
  public menuManager: MenuManager;

  // [Managers] Job
  private jobManager: JobManager;

  // [Managers] Vehicle
  public vehicleManager: VehicleManager;

  // [Controllers] Police
  // private cuffing: CuffingStuff;
  // private helicam: HelicamManager;
  private grabbing: Grabbing;

  // [Controllers] Weapons
  private weaponRemovers: WeaponRemovers;
  private weaponDisamers: Disarmer;
  private weaponReloading: Reloading;
  private weaponModes: WeaponModes;
  private weaponSpamPreventor: SpamPreventor;
  private weaponRecoil: WeaponRecoil;
  public weaponDisablers: WeaponDisablers;

  // [Controllers] Normal
  private playerNames: PlayerNames;
  private afk: AFK;

  constructor() {
    this.debugging = clientConfig.debug;
    this.developmentMode = (GetConvar('development_server', 'false') === "true");
    this.richPresenceData = clientConfig.richPresence;
    this.initialSpawn = true;
    
    // Events
    // (Resources)
    // on(Events.resourceStart, this.EVENT_resourceRestarted.bind(this));
    on(Events.resourceStop, this.EVENT_resourceStop.bind(this));

    // NUI Ready
    RegisterNuiCallback(NuiCallbacks.Ready, this.nuiLoaded.bind(this));

    // (Player Data)
    onNet(Events.playerLoaded, this.EVENT_playerLoaded.bind(this));
    onNet(Events.setCharacter, this.EVENT_setCharacter.bind(this));
    onNet(Events.developmentMode, this.EVENT_developmentMode.bind(this));
    onNet(Events.syncPlayers, this.EVENT_syncPlayers.bind(this));
    
    // (General Event Listeners)
    onNet(Events.gameEventTriggered, this.EVENT_gameEvent.bind(this));
    onNet(Events.notify, this.EVENT_notify.bind(this));

    // (General Methods)
    onNet(Events.teleportToMarker, this.EVENT_tpm.bind(this));
    onNet(Events.clearWorldVehs, this.EVENT_clearVehs.bind(this))

    // Callbacks
    onNet(Callbacks.takeScreenshot, this.CALLBACK_screenshot.bind(this));
  }

  // Getters & Setters 
  public get IsDebugging(): boolean {
    return this.debugging;
  }

  public get Developing(): boolean {
    return this.developmentMode;
  }

  public get Discord(): Record<string, any> {
    return this.richPresenceData;
  }

  public get UsingKeyboard(): boolean {
    return this.usingKeyboard;
  }

  public set UsingKeyboard(newState: boolean) {
    this.usingKeyboard = newState;
  }

  public get Spawned(): boolean {
    return !this.initialSpawn; // Returns the opposite, as the default of initalSpawn is true.
  }
  
  public get Player(): svPlayer {
    return this.player;
  }

  public get Players(): svPlayer[] {
    return this.players;
  }
  
  public get Character(): Character {
    return this.character;
  }

  // Methods
  public async initialize(): Promise<void> {
    // [Managers] Server Data
    this.richPresence = new RichPresence(client);
    this.staffManager = new StaffManager(client);

    // [Managers] World
    this.worldManager = new WorldManager(client);
    this.safezoneManager = new SafezoneManager(client);
    this.safezoneManager.init();

    // [Managers] Syncing
    this.timeManager = new TimeManager(client);
    this.weatherManager = new WeatherManager(client);
    this.aopManager = new AOPManager(client);

    // [Managers] Callbacks
    this.serverCallbackManager = new ServerCallbackManager(client);

    // [Managers] UI
    this.spawner = new Spawner(client);
    this.characters = new Characters(client);
    this.vehicles = new Vehicles(client);
    this.chatManager = new ChatManager(client);
    this.scoreboard = new Scoreboard(client);
    this.warnings = new Warnings(client);
    this.commends = new Commends(client);
    this.menuManager = new MenuManager(client);

    // [Managers] Job
    this.jobManager = new JobManager(client);

    // [Managers] Vehicle
    this.vehicleManager = new VehicleManager(client);
    this.vehicleManager.init();

    // [Controllers] Police
    // this.cuffing = new CuffingStuff();
    // this.helicam = new HelicamManager(client);
    this.grabbing = new Grabbing();
    
    // [Controllers] Weapon
    this.weaponRemovers = new WeaponRemovers(client);
    this.weaponDisamers = new Disarmer(client);
    this.weaponReloading = new Reloading(client);
    this.weaponModes = new WeaponModes(client);
    this.weaponSpamPreventor = new SpamPreventor(client);
    this.weaponRecoil = new WeaponRecoil(client);
    this.weaponDisablers = new WeaponDisablers();

    // [Controllers] Normal
    this.playerNames = new PlayerNames(client);
    this.afk = new AFK(client);

    this.registerExports();

    Inform(sharedConfig.serverName, "Successfully Loaded!");

    RegisterCommand("pistol", () => {
      const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
      if (currWeapon == Weapons.BerettaM9) {
        console.log(`Pistol Data: ${JSON.stringify(sharedConfig.weapons[currWeapon])}`)
      }
    }, false);

    // RegisterCommand("cuff", async() => {
    //   const [ped, distance] = await closestPed();
    //   this.cuffing.init(ped.Handle);
    // }, false);
  }

  public async nuiLoaded(cb: any, data: Record<string, any>): Promise<void> {
    // console.log("NUI READY!");
    this.nuiReady = true;
    await this.initialize();
    await this.spawner.init();
    this.startUI();

    emitNet(Events.playerConnected, undefined, true);
  }

  private startUI(): void {
    this.chatManager.init();
  }

  private setupUI(): void {
    this.chatManager.setupData(); // Send types and any client sided suggestions
    
    if (!this.Developing) {
      this.spawner.requestUI();
    } else {
      this.characters.displayCharacters(true);
    }

    // Managers Inits
    this.aopManager.init();
    this.vehicleManager.start();
    this.safezoneManager.start();

    // Weapons
    this.weaponRemovers.start();
    // this.weaponRecoil.init();
    this.weaponDisablers.start();
  }

  private registerStates(): void {
    let paused = false;
    
    this.playerStates = Player(GetPlayerServerId(Game.Player.Handle));
    this.playerStates.state.set("rankVisible", true, true);
    this.playerStates.state.set("chatOpen", false, true);
    this.playerStates.state.set("afk", false, true);
    this.playerStates.state.set("paused", false, true);

    this.statesTick = setTick(async() => {

      if (IsPauseMenuActive()) {
        if (await this.menuManager.IsAnyMenuOpen()) {
          this.menuManager.hide();
        }

        this.playerStates.state.set("paused", true, true);
        if(!paused) paused = true;
      } else {
        if (paused) {
          if (this.menuManager.Hidden) {
            this.menuManager.show();
          }
          
          this.playerStates.state.set("paused", false, true);
          paused = false;
        }
      }

      await Delay(500);
    });
  }
  
  private registerExports(): void {
    global.exports("getPlayer", async(source: string) => {
      return this.player;
    });

    global.exports("getCharacter", async(source: string) => {
      return this.character;
    });

    global.exports("notify", async(header: string, body: string, type: NotificationTypes, timer?: number, progress?: boolean) => {
      const notify = new Notification(header, body, type, timer, progress);
      await notify.send();
    });

    global.exports("usingKeyboard", this.UsingKeyboard);
  }

  // Events
  private EVENT_resourceStop(resourceName: string): void{
    if (resourceName == GetCurrentResourceName()) {
      this.grabbing.stop();
      // this.vehicleWeapon.stop();
    }
  }

  private async EVENT_playerLoaded(player: any): Promise<void> {
    this.player = new svPlayer(player);

    // Manager Inits
    this.staffManager.init();
    await this.worldManager.init();
    this.jobManager.init();

    this.setupUI();
    
    // Register Player Statebags
    this.registerStates();
  }

  private EVENT_setCharacter(character: any): void {
    Game.PlayerPed.removeAllWeapons();
    this.character = new Character(character);

    // console.log("Character Set To", this.Character);
  }

  private EVENT_developmentMode(newState: boolean): void {
    this.developmentMode = newState;
  }

  private EVENT_syncPlayers(newPlayers: any[]) {
    this.players = [];
    
    for (let i = 0; i < Object.keys(newPlayers).length; i++) {
      const player = new svPlayer(newPlayers[i]);
      this.players.push(player);
    }
    
    Inform("Syncing Players", `Server players is now ${JSON.stringify(this.players)}`);
  }

  private async EVENT_tpm(): Promise<void> {
    const myPed = Game.PlayerPed;

    if (!IsWaypointActive()) {
      const notify = new Notification("TPM", "You don't have a waypoint set!", NotificationTypes.Error);
      return
    }

    const waypointHandle = GetFirstBlipInfoId(8);

    if (DoesBlipExist(waypointHandle)) {
      const waypointCoords = NumToVector3(GetBlipInfoIdCoord(waypointHandle));
      const teleported = await teleportToCoords(waypointCoords);
      if (teleported) {
        emit(Events.sendSystemMessage, new Message("Teleported to waypoint.", SystemTypes.Interaction));
        const notify = new Notification("Teleporter", "Teleported to waypoint", NotificationTypes.Success);
        await notify.send();
      }
    }
  }

  private EVENT_clearVehs(): void {
    const worldVehs = World.getAllVehicles();
    
    for (let i = 0; i < worldVehs.length; i++) {
      if (!worldVehs[i].getPedOnSeat(VehicleSeat.Driver).IsPlayer) {
        worldVehs[i].PreviouslyOwnedByPlayer = false;
        SetEntityAsMissionEntity(worldVehs[i].Handle, false, false);
        worldVehs[i].delete();
        if (worldVehs[i].exists()) {
          worldVehs[i].delete();
        }
      }
    }
  }

  private EVENT_pedDied(damagedEntity: number, attackingEntity: number, weaponHash: number, isMelee: boolean): void {
    if (IsPedAPlayer(damagedEntity) && damagedEntity == Game.PlayerPed.Handle) {
      if (IsPedAPlayer(attackingEntity)) {
        emitNet(Events.logDeath, {
          type: GetEntityType(attackingEntity),
          inVeh: IsPedInAnyVehicle(attackingEntity, false) && GetPedInVehicleSeat(GetVehiclePedIsIn(attackingEntity, false), VehicleSeat.Driver),
          weapon: weaponHash,
          attacker: GetPlayerServerId(NetworkGetPlayerIndexFromPed(attackingEntity))
        });
      } else {
        if (attackingEntity == -1) {
          emitNet(Events.logDeath, {
            attacker: attackingEntity
          });
        }
      }
    }
  }

  private EVENT_gameEvent(eventName: string, eventArgs: any[]): void {
    if (eventName == GameEvents.entityDamaged) {
      const damagedEntity = eventArgs[0];
      const attackingEntity = eventArgs[1];

      if (IsPedAPlayer(damagedEntity) && damagedEntity == Game.PlayerPed.Handle) {
        if (IsPedAPlayer(attackingEntity)) {
          const isFatal = eventArgs[5];
          if (isFatal) {
            emitNet(Events.logDeath, {
              type: GetEntityType(attackingEntity),
              inVeh: IsPedInAnyVehicle(attackingEntity, false) && GetPedInVehicleSeat(GetVehiclePedIsIn(attackingEntity, false), VehicleSeat.Driver),
              weapon: eventArgs[6],
              attacker: GetPlayerServerId(NetworkGetPlayerIndexFromPed(eventArgs[1]))
            });
          }
        } else {
          if (attackingEntity == -1) {
            emitNet(Events.logDeath, {
              attacker: attackingEntity
            });
          }
        }
      }
    }
  }

  private EVENT_notify(title: string, description: string, type: NotificationTypes, timer: number, progressBar: boolean): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.CreateNotification,
      data: {
        title: title,
        text: description,
        status: type,
        effect: "slide",
        speed: 300,
        autoclose: true,
        autotimeout: timer,
        type: 2,
        position: "top left",
        progress: progressBar,
        showCloseButton: false
      }
    }));
  }

  // Callbacks
  private CALLBACK_screenshot(data): void { // Screenshot Client CB
    if (!takingScreenshot) {
      takingScreenshot = true;
      global.exports['astrid_notify'].requestScreenshotUpload("https://api.imgur.com/3/image", 'imgur', {
        headers: {
          ['authorization']: "Client-ID 3886c6731298c37",
          ['content-type']: 'multipart/form-data'
        }
      }, (results) => {
        // console.log(JSON.parse(results).data.link)
        data.url = JSON.parse(results).data.link;
        takingScreenshot = false
        emitNet(Events.receiveClientCB, false, data);
      });
    }
  }
}

export const client = new Client();
