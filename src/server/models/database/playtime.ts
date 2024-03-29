import { Times } from "../../enums/database/times";

export class Playtime {
  private seconds: number;
  public days: number;
  public hours: number;
  public minutes: number;

  constructor(seconds: number) {
    this.seconds = seconds;
    this.days = Math.floor(this.seconds / Times.Days);
    this.hours = Math.floor((this.seconds / Times.Hours) % 24);
    this.minutes = Math.floor(this.seconds / Times.Minutes) % Times.Minutes
  }

  // Methods
  public async FormatTime(): Promise<string> {
    if (this.days > 0) {
      return `${this.days}d ${this.hours}h ${this.minutes}m`;
    } else if (this.days <= 0 && this.hours > 0) {
      return `${this.hours}h ${this.minutes}m`;
    } else if (this.days <= 0 && this.hours <= 0) {
      return `${this.minutes}m`;
    }
  }
}
