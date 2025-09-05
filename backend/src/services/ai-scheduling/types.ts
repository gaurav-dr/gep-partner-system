export interface AlgorithmConfig {
  id: string;
  name: string;
  algorithm_type: 'linear_programming' | 'genetic' | 'ml_based' | 'rule_based' | 'anthropic';
  version: string;
  parameters: Record<string, any>;
  weights: {
    location: number;
    availability: number;
    cost: number;
    specialty: number;
  };
  is_production: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  total_runs?: number;
  successful_runs?: number;
  average_execution_time_ms?: number;
  average_optimization_score?: number;
}

export interface AlgorithmData {
  scheduler: any;
  config: AlgorithmConfig;
  stats: {
    totalRuns: number;
    successfulRuns: number;
    averageExecutionTime: number;
    averageOptimizationScore: number;
  };
}

export interface ScheduleRequest {
  contractCode: string;
  installationCode: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  minimumHoursPerMonth: number;
  specialRequirements?: string;
}

export interface SchedulingContext {
  installation: any;
  contract: any;
  availablePartners: any[];
  regulatoryRequirements: RegulatoryRequirements;
  constraints: SchedulingConstraints;
  objectives: SchedulingObjectives;
  historicalData: any[];
  partnerPatterns: any[];
}

export interface RegulatoryRequirements {
  totalHours: number;
  minimumHoursPerMonth: number;
  excludeWeekends?: boolean;
  workingHours?: string;
}

export interface SchedulingConstraints {
  excludeWeekends: boolean;
  workingHours: string;
  minimumVisitDuration: number;
  maximumVisitDuration: number;
  minimumGapBetweenVisits: number;
  partnerAvailability: any[];
}

export interface SchedulingObjectives {
  costWeight: number;
  qualityWeight: number;
  proximityWeight: number;
  availabilityWeight: number;
  preferredStartTime?: string;
  flexibilityRequirement: number;
}

export interface AlgorithmResult {
  algorithmId: string;
  algorithmName: string;
  algorithmType: string;
  result: any;
  score: number;
  executionTime: number;
  feasible: boolean;
  confidence: number;
  partnerId?: string;
  partnerName?: string;
  visits?: Visit[];
  totalHours?: number;
  metadata?: any;
}

export interface ScheduleData {
  scheduleId: string;
  algorithmUsed: string;
  optimizationScore: number;
  executionTime: number;
  feasible: boolean;
  partnerId?: string;
  partnerName?: string;
  totalVisits: number;
  totalHours: number;
  visits: Visit[];
  createdAt: Date;
  metadata: any;
}

export interface Visit {
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  notes: string;
  specialRequirements?: string | null;
}

export interface VisitRecord {
  schedule_id: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  visit_type: string;
  notes: string;
  special_requirements?: string;
}

export interface PerformanceComparison {
  totalAlgorithms: number;
  successfulAlgorithms: number;
  bestPerformer: {
    algorithmId: string;
    algorithmName: string;
    score: number;
    executionTime: number;
  };
  averageScore: number;
  averageExecutionTime: number;
  performanceSpread: number;
  algorithmRankings: Array<{
    rank: number;
    algorithmId: string;
    algorithmName: string;
    score: number;
    executionTime: number;
    feasible: boolean;
  }>;
}

export interface AlgorithmPerformanceSummary {
  algorithmId: string;
  algorithmName: string;
  totalRuns: number;
  successfulRuns: number;
  averageScore: number;
  averageExecutionTime: number;
  successRate: number;
  lastUsed: Date;
}

export interface PerformanceMetricData {
  algorithm: string;
  requestId?: number;
  partnerId?: string;
  executionTimeMs: number;
  optimizationScore: number;
  feasible: boolean;
  inputSize: number;
  contextComplexity: number;
  timestamp: Date;
}