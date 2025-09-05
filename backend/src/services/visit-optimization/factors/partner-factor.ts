// Partner Factor Calculator
export interface PartnerFactor {
  calculateFactor(partnerData: any): number;
}

export class DefaultPartnerFactor implements PartnerFactor {
  calculateFactor(partnerData: any): number {
    // Default implementation
    return 1.0;
  }
}