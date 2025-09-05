// Duration Options Calculator
export interface DurationOptions {
  calculateDurationOptions(data: any): any[];
}

export class DefaultDurationOptions implements DurationOptions {
  calculateDurationOptions(data: any): any[] {
    // Default implementation
    return [];
  }
}