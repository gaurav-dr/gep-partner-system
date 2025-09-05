# Tiered AI Algorithm Manager Design - September 5, 2025

## Overview
This document outlines the design for a cost-optimized tiered AI scheduling algorithm manager that prioritizes free mathematical algorithms over expensive API calls, only escalating to premium AI services when quality scores fall below defined thresholds.

## Current Problem
The existing `AISchedulingAlgorithmManager` runs all algorithms in parallel, including expensive Anthropic API calls on every scheduling request. This approach:
- Generates unnecessary API costs for requests that could be solved with free algorithms
- Wastes computational resources by running expensive operations when simpler solutions suffice
- Lacks intelligent decision-making about when premium AI is actually needed

## Proposed Tiered Architecture

### Tier 1: Free Mathematical Algorithms (Primary)
- **Linear Programming Scheduler**: Optimization-based approach for constraint satisfaction
- **Genetic Algorithm Scheduler**: Evolutionary approach for complex multi-objective optimization  
- **Rule-Based Scheduler**: Business logic and regulatory compliance focused

### Tier 2: Premium AI Services (Escalation Only)
- **Anthropic Scheduler**: Advanced AI reasoning for complex edge cases
- **Future ML Services**: Additional premium AI providers as needed

## Scoring System
Each algorithm result receives a composite score (0-100) based on:
- **Optimization Score (40%)**: Core scheduling efficiency and quality
- **Feasibility Score (25%)**: Whether solution meets all constraints
- **Confidence Score (20%)**: Algorithm's confidence in the solution
- **Execution Efficiency (15%)**: Speed and resource utilization

## Escalation Logic
```typescript
interface TieredExecutionConfig {
  tier1Threshold: number;    // Default: 75 (escalate if all tier1 scores < 75)
  maxTier1Attempts: number;  // Default: 3 (try up to 3 tier1 algorithms)
  enableTier2: boolean;      // Default: true (allow escalation)
  budgetLimit: number;       // Daily API cost limit in euros
  emergencyOverride: boolean; // Allow emergency escalation beyond budget
}
```

## Implementation Design

### Core Classes
```typescript
// Main orchestrator
class TieredAISchedulingManager {
  private tier1Algorithms: BaseScheduler[];
  private tier2Algorithms: BaseScheduler[];
  private scoringEngine: AlgorithmScoringEngine;
  private budgetManager: AIBudgetManager;
  private escalationRules: EscalationRuleEngine;
}

// Scoring and evaluation
class AlgorithmScoringEngine {
  calculateCompositeScore(result: SchedulingResult): number;
  compareResults(results: SchedulingResult[]): RankingResult;
  shouldEscalate(scores: number[], threshold: number): boolean;
}

// Cost management
class AIBudgetManager {
  trackAPIUsage(algorithmId: string, cost: number): void;
  checkBudgetAvailable(estimatedCost: number): boolean;
  getDailySpend(): number;
  getMonthlyProjection(): number;
}

// Business logic for escalation decisions
class EscalationRuleEngine {
  shouldEscalateToTier2(context: SchedulingContext, tier1Results: SchedulingResult[]): boolean;
  selectTier2Algorithm(context: SchedulingContext): string;
  applyEmergencyOverride(context: SchedulingContext): boolean;
}
```

### Execution Flow
1. **Tier 1 Execution**: Run up to 3 free algorithms in parallel
2. **Scoring**: Calculate composite scores for all tier 1 results
3. **Quality Check**: If best score ≥ 75, return best result
4. **Escalation Decision**: If all scores < 75, check budget and escalation rules
5. **Tier 2 Execution**: Run selected premium AI algorithm if approved
6. **Final Selection**: Compare all results and select optimal solution
7. **Audit & Learning**: Log decisions and outcomes for future improvement

### Budget Controls
```typescript
interface BudgetConfiguration {
  dailyLimit: number;        // €10 default daily limit
  monthlyLimit: number;      // €200 default monthly limit
  costPerRequest: {
    anthropic: number;       // €0.15 per request estimated
    future_ml: number;       // TBD
  };
  alertThresholds: {
    daily: number;          // Alert at 80% daily usage
    monthly: number;        // Alert at 90% monthly usage
  };
}
```

### Performance Monitoring
```typescript
interface TieredPerformanceMetrics {
  tier1Statistics: {
    totalRequests: number;
    successRate: number;
    averageScore: number;
    averageExecutionTime: number;
  };
  tier2Statistics: {
    escalationRate: number;  // % of requests that escalated
    costPerEscalation: number;
    averageImprovement: number; // Score improvement vs tier 1
  };
  budgetMetrics: {
    dailySpend: number;
    monthlySpend: number;
    costSavings: number;    // Estimated savings vs always-AI approach
  };
}
```

## Benefits of Tiered Approach

### Cost Optimization
- **Estimated 70-80% cost reduction** by avoiding unnecessary premium API calls
- **Predictable budget management** with daily/monthly limits and monitoring
- **Scalable cost structure** that grows only with actual complexity needs

### Performance Benefits
- **Faster response times** for straightforward scheduling requests
- **Reduced API rate limiting** issues from high-frequency usage
- **Better fault tolerance** with multiple fallback options

### Quality Assurance
- **Best of both worlds**: Mathematical precision for standard cases + AI intelligence for edge cases
- **Continuous improvement** through scoring and learning mechanisms
- **Transparent decision-making** with clear escalation criteria

## Migration Strategy

### Phase 1: Core Implementation
1. Implement `TieredAISchedulingManager` class
2. Create scoring engine and budget management
3. Integrate with existing algorithm classes

### Phase 2: Intelligence Layer
1. Implement escalation rule engine
2. Add performance monitoring and metrics
3. Create admin dashboard for budget/performance tracking

### Phase 3: Optimization
1. Machine learning for escalation threshold optimization
2. Historical performance analysis for algorithm selection
3. Advanced budget forecasting and optimization

## Configuration Example
```typescript
const tieredConfig: TieredExecutionConfig = {
  tier1Threshold: 75,        // Escalate if best score < 75
  maxTier1Attempts: 3,       // Try up to 3 free algorithms
  enableTier2: true,         // Allow escalation
  budgetLimit: 10,          // €10 daily limit
  emergencyOverride: false   // No emergency overrides
};

const budgetConfig: BudgetConfiguration = {
  dailyLimit: 10,           // €10/day
  monthlyLimit: 200,        // €200/month
  costPerRequest: {
    anthropic: 0.15         // €0.15 per request
  },
  alertThresholds: {
    daily: 0.8,             // Alert at 80% daily usage
    monthly: 0.9            // Alert at 90% monthly usage
  }
};
```

## Success Metrics
- **Cost Reduction**: Target 70-80% reduction in AI API costs
- **Quality Maintenance**: Maintain >90% user satisfaction with scheduling results
- **Performance**: <2 second average response time for tier 1, <5 seconds including tier 2
- **Reliability**: 99.5% success rate across all tiers

---
*This design represents a fundamental shift from "AI-first" to "intelligence-when-needed" architecture, optimizing for both cost efficiency and solution quality.*