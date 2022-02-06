export enum ChatTypes {
  Local,
  Global,
  Admin,
  System
}

export enum SystemTypes {
  Kill = "kill",
  Interaction = "interaction",
  Action = "action",
  Error = "error",
  Advert = "advert", // Requires you to pass player name param to client
  Me = "me", // Requires you to pass player name param to client
}
