import { OptimizationWeights, ServiceDurations, ComplexityMultipliers, OptimizationConfig } from '../types';

export const DEFAULT_OPTIMIZATION_WEIGHTS: OptimizationWeights = {
  installationSize: 0.25,
  partnerExpertise: 0.20,
  costEfficiency: 0.15,
  proximity: 0.15,
  historicalData: 0.15,
  regulatoryCompliance: 0.10
};

export const SERVICE_DURATIONS: ServiceDurations = {
  occupational_doctor: {
    min: 2,
    max: 8,
    default: 4
  },
  safety_engineer: {
    min: 3,
    max: 10,
    default: 6
  },
  specialist_consultation: {
    min: 1,
    max: 6,
    default: 3
  }
};

export const COMPLEXITY_MULTIPLIERS: ComplexityMultipliers = {
  A: 1.5,  // High complexity installations
  B: 1.2,  // Medium complexity installations
  C: 1.0   // Low complexity installations
};

export const DISTANCE_THRESHOLDS = {
  LOCAL: 20,      // km
  REGIONAL: 100,  // km
  NATIONAL: 500   // km
};

export const COST_FACTORS = {
  TRAVEL_COST_PER_KM: 0.5,
  BASE_EQUIPMENT_COST: 50,
  OVERHEAD_MULTIPLIER: 1.3,
  SEASONAL_PREMIUM: 1.1
};

export const QUALITY_THRESHOLDS = {
  MIN_CONFIDENCE: 0.6,
  HIGH_CONFIDENCE: 0.85,
  EXCELLENT_CONFIDENCE: 0.95
};

export const REGULATORY_MINIMUMS = {
  BASIC_INSPECTION: 2,
  COMPREHENSIVE_AUDIT: 6,
  SPECIALIST_REVIEW: 4,
  EMERGENCY_ASSESSMENT: 1
};

export const SEASONAL_ADJUSTMENTS = {
  WINTER: { demand: 1.2, weather: 1.15, holiday: 1.1 },
  SPRING: { demand: 1.0, weather: 1.0, holiday: 1.0 },
  SUMMER: { demand: 0.9, weather: 1.05, holiday: 1.15 },
  AUTUMN: { demand: 1.1, weather: 1.0, holiday: 1.0 }
};

export const WORKLOAD_BALANCE_TARGETS = {
  IDEAL_UTILIZATION: 0.8,
  MAX_UTILIZATION: 0.95,
  MIN_UTILIZATION: 0.4,
  MAX_HOURS_PER_WEEK: 40
};

export const DEFAULT_CONFIG: OptimizationConfig = {
  weights: DEFAULT_OPTIMIZATION_WEIGHTS,
  serviceDurations: SERVICE_DURATIONS,
  complexityMultipliers: COMPLEXITY_MULTIPLIERS,
  maxDistanceKm: DISTANCE_THRESHOLDS.NATIONAL,
  minConfidenceThreshold: QUALITY_THRESHOLDS.MIN_CONFIDENCE,
  seasonalAdjustmentEnabled: true
};

export class OptimizationConfigManager {
  private static instance: OptimizationConfigManager;
  private config: OptimizationConfig;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  public static getInstance(): OptimizationConfigManager {
    if (!OptimizationConfigManager.instance) {
      OptimizationConfigManager.instance = new OptimizationConfigManager();
    }
    return OptimizationConfigManager.instance;
  }

  public getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  public updateWeights(weights: Partial<OptimizationWeights>): void {
    this.config.weights = { ...this.config.weights, ...weights };
    this.normalizeWeights();
  }

  public updateServiceDurations(serviceType: keyof ServiceDurations, durations: Partial<ServiceDurations[keyof ServiceDurations]>): void {
    this.config.serviceDurations[serviceType] = {
      ...this.config.serviceDurations[serviceType],
      ...durations
    };
  }

  public resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  private normalizeWeights(): void {
    const total = Object.values(this.config.weights).reduce((sum, weight) => sum + weight, 0);
    if (total !== 1.0) {
      Object.keys(this.config.weights).forEach(key => {
        this.config.weights[key as keyof OptimizationWeights] /= total;
      });
    }
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate weights sum to 1.0
    const weightSum = Object.values(this.config.weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightSum - 1.0) > 0.001) {
      errors.push(`Weights must sum to 1.0, current sum: ${weightSum}`);
    }

    // Validate duration bounds
    Object.entries(this.config.serviceDurations).forEach(([service, bounds]) => {
      if (bounds.min >= bounds.max) {
        errors.push(`Invalid duration bounds for ${service}: min (${bounds.min}) must be less than max (${bounds.max})`);
      }
      if (bounds.default < bounds.min || bounds.default > bounds.max) {
        errors.push(`Invalid default duration for ${service}: ${bounds.default} is outside bounds [${bounds.min}, ${bounds.max}]`);
      }
    });

    // Validate complexity multipliers
    const multipliers = Object.values(this.config.complexityMultipliers);
    if (!multipliers.every(m => m > 0)) {
      errors.push('All complexity multipliers must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}