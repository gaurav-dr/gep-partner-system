// Main Visit Duration Optimizer with modular architecture
import VisitDurationOptimizer from './VisitDurationOptimizer';

export default VisitDurationOptimizer;
export { VisitDurationOptimizer };
export * from './types';

// Re-export key components for advanced usage
export { OptimizationEngine } from './core/optimization-engine';
export { OptimizationConfigManager } from './config/optimization-config';

// Export feature modules
export { BatchOptimizer } from './features/batch-optimizer';
export { WorkloadBalancer } from './features/workload-balancer';  
export { SeasonalAdjuster } from './features/seasonal-adjuster';