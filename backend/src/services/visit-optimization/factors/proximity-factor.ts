// Proximity Factor Calculator
export interface ProximityFactor {
  calculateFactor(proximityData: any): number;
}

export class DefaultProximityFactor implements ProximityFactor {
  calculateFactor(proximityData: any): number {
    // Default implementation
    return 1.0;
  }
}