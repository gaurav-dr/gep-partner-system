export interface OptimizationWeights {
  installationSize: number;
  partnerExpertise: number;
  costEfficiency: number;
  proximity: number;
  historicalData: number;
  regulatoryCompliance: number;
}

export interface DurationBounds {
  min: number;
  max: number;
  default: number;
}

export interface ServiceDurations {
  occupational_doctor: DurationBounds;
  safety_engineer: DurationBounds;
  specialist_consultation: DurationBounds;
}

export interface ComplexityMultipliers {
  A: number; // High complexity
  B: number; // Medium complexity
  C: number; // Low complexity
}

export interface OptimizationContext {
  installation?: {
    installation_code?: string;
    service_type?: string;
    employees_count?: number;
    category?: string;
    special_requirements?: string;
    address?: string;
  };
  selectedPartner?: {
    id: string;
    specialty?: string;
    hourly_rate?: number;
    city?: string;
  };
  availablePartners?: PartnerDetails[];
  schedulingConstraints?: {
    timeSlots?: string[];
    maxDuration?: number;
    preferredDuration?: number;
  };
}

export interface OptimizationFactors {
  installationFactor: number;
  partnerFactor: number;
  costFactor: number;
  proximityFactor: number;
  historicalFactor: number;
  regulatoryFactor: number;
  overallScore: number;
}

export interface DurationOption {
  duration: number;
  confidence: number;
  cost: number;
  reasoning: string;
  factors: OptimizationFactors;
}

export interface OptimizationResult {
  recommendedDuration: number;
  confidence: number;
  alternatives: DurationOption[];
  factors: OptimizationFactors;
  reasoning: string;
  costEstimate: number;
}

export interface BatchOptimizationResult {
  optimizations: Array<{
    installationCode: string;
    result: OptimizationResult;
  }>;
  summary: {
    totalProcessed: number;
    averageDuration: number;
    totalCostEstimate: number;
    averageConfidence: number;
  };
  workloadBalance: WorkloadBalanceResult;
}

export interface WorkloadBalanceResult {
  partnerWorkloads: Array<{
    partnerId: string;
    partnerName: string;
    totalHours: number;
    visitCount: number;
    averageDuration: number;
    utilizationRate: number;
  }>;
  balanceScore: number;
  recommendations: string[];
}

export interface SeasonalAdjustmentResult {
  baseOptimization: OptimizationResult;
  seasonalOptimization: OptimizationResult;
  adjustmentFactor: number;
  seasonalFactors: {
    demandMultiplier: number;
    weatherImpact: number;
    holidayImpact: number;
  };
}

export interface PartnerExperienceData {
  partnerId: string;
  serviceType: string;
  totalVisits: number;
  averageDuration: number;
  successRate: number;
  clientSatisfaction: number;
  specialtyMatch: number;
}

export interface PartnerDetails {
  id: string;
  name: string;
  specialty?: string;
  hourly_rate?: number;
  city?: string;
  experience_years?: number;
  rating?: number;
  specializations?: string[];
}

export interface HistoricalPerformanceData {
  installationCode: string;
  serviceType: string;
  averageDuration: number;
  successfulVisits: number;
  totalVisits: number;
  averageCost: number;
  partnerPerformance: Array<{
    partnerId: string;
    averageDuration: number;
    successRate: number;
    cost: number;
  }>;
}

export interface InstallationComplexityData {
  category: string;
  employeeCount: number;
  specialRequirements: string[];
  hazardLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  accessibilityFactors: string[];
  regulatoryRequirements: string[];
}

export interface CostAnalysisData {
  hourlyRate: number;
  travelCosts: number;
  equipmentCosts: number;
  overheadMultiplier: number;
  seasonalPricing: boolean;
}

export interface ProximityData {
  partnerLocation: {
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  installationLocation: {
    address: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  distance?: number;
  travelTime?: number;
}

export interface RegulatoryRequirement {
  type: string;
  minimumDuration: number;
  frequency: string;
  specialCertifications: string[];
  documentationRequired: string[];
}

export interface OptimizationConfig {
  weights: OptimizationWeights;
  serviceDurations: ServiceDurations;
  complexityMultipliers: ComplexityMultipliers;
  maxDistanceKm: number;
  minConfidenceThreshold: number;
  seasonalAdjustmentEnabled: boolean;
}