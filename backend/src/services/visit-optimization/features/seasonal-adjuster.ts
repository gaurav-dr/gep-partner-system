// Seasonal Adjuster
export interface SeasonalAdjuster {
  adjust(data: any): Promise<any>;
}

export class DefaultSeasonalAdjuster implements SeasonalAdjuster {
  async adjust(data: any): Promise<any> {
    // Default implementation
    return { adjusted: true, data };
  }
}