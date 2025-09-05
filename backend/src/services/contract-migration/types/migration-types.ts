export interface MigrationStats {
  processed: number;
  successful: number;
  failed: number;
  warnings: number;
}

export interface VisitData {
  id: string;
  partner_id: string;
  installation_code: string;
  visit_date: string;
  service_type?: string;
  partners?: {
    id: string;
    name: string;
    specialty: string;
    city: string;
  };
  installations?: {
    installation_code: string;
    company_name: string;
    address: string;
    employees_count: number;
    category: string;
  };
}

export interface VisitAnalysis {
  totalVisits: number;
  uniquePartners: number;
  uniqueInstallations: number;
  visitsByPartner: Record<string, VisitData[]>;
  visitsByInstallation: Record<string, VisitData[]>;
  partnerInstallationPairs: PartnerInstallationPair[];
  visitFrequency: Record<string, any>;
  temporalPatterns: Record<string, any>;
  summary: {
    avgVisitsPerPartner: number;
    avgVisitsPerInstallation: number;
    strongRelationships: number;
    recentVisits: number;
  };
}

export interface PartnerInstallationPair {
  partnerId: string;
  partnerName: string;
  installationCode: string;
  installationName: string;
  visits: VisitData[];
  visitCount: number;
  firstVisit: string;
  lastVisit: string;
}

export interface RelationshipStrength {
  score: number;
  type: 'exclusive' | 'primary' | 'regular' | 'occasional' | 'weak' | 'unknown';
  factors: {
    visitFrequency: number;
    recency: number;
    consistency: number;
    serviceMatch: number;
  };
}

export interface IdentifiedRelationship extends PartnerInstallationPair {
  relationshipStrength: number;
  relationshipType: string;
  averageInterval: number;
  serviceTypes: string[];
  confidenceFactors: RelationshipStrength['factors'];
  migrationPriority: number;
}

export interface ContractAssignmentResults {
  successful: number;
  failed: number;
  warnings: number;
  unassigned: InstallationData[];
  assignments: ContractAssignment[];
}

export interface BatchAssignmentResults {
  successful: number;
  failed: number;
  warnings: number;
  assignments: ContractAssignment[];
}

export interface ContractAssignment {
  contractId: string;
  contractCode: string;
  partnerId: string;
  partnerName: string;
  installationCode: string;
  installationName: string;
  confidence: number;
  migrationDate: string;
}

export interface InstallationData {
  id: string;
  installation_code: string;
  company_name: string;
  address: string;
  employees_count: number;
  category: string;
}

export interface ContractParameters {
  serviceType: string;
  startDate: string;
  endDate: string;
  contractValue: number;
  services: any[];
}

export interface ContractData {
  contract_code: string;
  installation_code: string;
  partner_id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  contract_value: number;
  status: string;
  migration_source: string;
  migration_confidence: number;
  migration_date: string;
  notes: string;
  created_by: string;
  metadata: {
    originalVisitCount: number;
    relationshipStrength: number;
    lastHistoricalVisit: string;
    migrationReason: string;
  };
}

export interface AssignmentStrategy {
  type: 'suggest_partners' | 'auto_assign' | 'manual_review';
  suggestions?: any[];
  partner?: any;
  reason?: string;
}

export interface UnassignedResults {
  processed: number;
  assigned: number;
  flagged: number;
  strategies: Record<string, number>;
}

export interface ValidationResults {
  duplicates: number;
  missing: number;
  integrityIssues: number;
  coverage: {
    percentage: number;
  };
  validationPassed: boolean;
  warnings: string[];
}

export interface MigrationReport {
  migrationSummary: {
    executionDate: string;
    totalProcessed: number;
    successfulAssignments: number;
    failedAssignments: number;
    warnings: number;
    successRate: number;
  };
  dataAnalysis: {
    historicalVisits: number;
    uniquePartners: number;
    uniqueInstallations: number;
    strongRelationships: number;
    averageRelationshipStrength: number;
  };
  assignmentResults: {
    automaticAssignments: number;
    failedAssignments: number;
    unassignedInstallations: number;
    coveragePercentage: number;
  };
  validationResults: ValidationResults;
  recommendations: string[];
  nextSteps: string[];
}

export interface MigrationConfiguration {
  minimumVisitThreshold: number;
  relationshipStrengthThreshold: number;
  autoAssignmentConfidenceThreshold: number;
  maxDaysForRecentVisit: number;
  batchSize: number;
}

export interface PartnerSuggestion {
  partnerId: string;
  partnerName: string;
  score: number;
  reasons: string[];
  specialty: string;
  city: string;
}

export interface ScoringFactors {
  visitFrequency: number;
  recency: number;
  consistency: number;
  serviceMatch: number;
  geographicProximity?: number;
  specialtyMatch?: number;
}