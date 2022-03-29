export enum ChatTypes {
  Local,
  Global,
  Admin,
  System
}

export enum SystemTypes {
  Kill = "kill", // Yellow kill logs
  Interaction = "interaction", // Green message used for logging an action like collecting something or your rank changes
  Action = "action", // Orange action such as you put your take a rest
  Error = "error",
  Success = "success",
  Dispatch = "dispatch", // Red dispatch message
  Announcement = "announcement",
  Admin = "adminAction",
  Advert = "advert", // Requires you to pass player name param to client
  Me = "me", // Requires you to pass player name param to client
}
