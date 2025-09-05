// Cost Factor Calculator
export interface CostFactor {
  calculateFactor(costData: any): number;
}

export class DefaultCostFactor implements CostFactor {
  calculateFactor(costData: any): number {
    // Default implementation
    return 1.0;
  }
}