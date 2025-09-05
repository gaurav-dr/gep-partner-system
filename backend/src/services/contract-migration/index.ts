// Main Contract Migration Service with modular architecture
import ContractMigrationService from './ContractMigrationService';

export default ContractMigrationService;
export { ContractMigrationService };
export * from './types/migration-types';

// Re-export key components for advanced usage
export { default as VisitDataAnalyzer } from './data-analysis/VisitDataAnalyzer';
export { default as ContractAssignmentManager } from './contract-assignment/ContractAssignmentManager';