// Historical Factor Calculator
export interface HistoricalFactor {
  calculateFactor(historicalData: any): number;
}

export class DefaultHistoricalFactor implements HistoricalFactor {
  calculateFactor(historicalData: any): number {
    // Default implementation
    return 1.0;
  }
}