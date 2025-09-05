// Regulatory Factor Calculator
export interface RegulatoryFactor {
  calculateFactor(regulatoryData: any): number;
}

export class DefaultRegulatoryFactor implements RegulatoryFactor {
  calculateFactor(regulatoryData: any): number {
    // Default implementation
    return 1.0;
  }
}