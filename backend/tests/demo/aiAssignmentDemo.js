/**
 * AI Assignment Engine Demo
 * Demonstrates the performance-based partner assignment with realistic data
 */

const OptimizationEngine = require('../../src/services/OptimizationEngine');
const TestDataFactory = require('../factories/testDataFactory');

// Mock logger for standalone execution
const path = require('path');
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === '../utils/logger' || id.endsWith('utils/logger')) {
    return {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {}
    };
  }
  return originalRequire.apply(this, arguments);
};

async function demonstrateAIAssignment() {
  console.log('🤖 AI Partner Assignment Engine Demo\n');
  console.log('=' .repeat(60));
  
  const optimizationEngine = new OptimizationEngine();
  const testDataFactory = new TestDataFactory();
  
  // Create realistic demo scenario
  console.log('📊 Creating realistic test data...');
  const partners = testDataFactory.generatePartners(8);
  const installation = testDataFactory.generateInstallations(1, { urgency_level: 'high' })[0];
  
  console.log(`\n🏢 Installation: ${installation.company_name}`);
  console.log(`   📍 Location: ${installation.address}`);
  console.log(`   👥 Employees: ${installation.employee_count}`);
  console.log(`   ⚡ Urgency: ${installation.urgency_level}`);
  console.log(`   💰 Max Budget: €${installation.max_budget}`);
  
  console.log('\n👥 Available Partners:');
  console.log('-'.repeat(80));
  partners.forEach((partner, i) => {
    const metrics = partner.performance_metrics;
    console.log(`${i + 1}. ${partner.name} (${partner.city})`);
    console.log(`   📊 Completion Rate: ${metrics.completion_rate.toFixed(1)}%`);
    console.log(`   ⏱️  Response Time: ${metrics.avg_response_time.toFixed(1)}h`);
    console.log(`   ⭐ Satisfaction: ${metrics.client_satisfaction.toFixed(1)}/5`);
    console.log(`   💰 Rate: €${partner.hourly_rate}/h`);
    console.log(`   📅 Load: ${partner.availability.current_load}/${partner.availability.weekly_capacity}h`);
    console.log('');
  });
  
  // Run AI optimization
  console.log('🧠 Running AI Assignment Algorithm...\n');
  const startTime = Date.now();
  const result = await optimizationEngine.optimize(installation, partners);
  const duration = Date.now() - startTime;
  
  console.log('🎯 OPTIMIZATION RESULTS');
  console.log('=' .repeat(60));
  
  if (result.selectedPartner) {
    const selected = result.selectedPartner;
    const metrics = selected.performance_metrics;
    
    console.log(`🏆 SELECTED PARTNER: ${selected.name}`);
    console.log(`   📊 Overall Score: ${selected.score.toFixed(2)}/100`);
    console.log('');
    console.log('   📈 Component Scores:');
    console.log(`   • Performance: ${selected.performance_score.toFixed(1)}/100`);
    console.log(`   • Location: ${selected.location_score.toFixed(1)}/100`);
    console.log(`   • Availability: ${selected.availability_score.toFixed(1)}/100`);
    console.log(`   • Cost: ${selected.cost_score.toFixed(1)}/100`);
    console.log(`   • Specialty: ${selected.specialty_score.toFixed(1)}/100`);
    console.log('');
    console.log('   🔍 Selection Reasons:');
    console.log(`   • Completion Rate: ${metrics.completion_rate.toFixed(1)}% ${metrics.completion_rate > 70 ? '✅' : '⚠️'}`);
    console.log(`   • Response Time: ${metrics.avg_response_time.toFixed(1)}h ${metrics.avg_response_time < 3 ? '✅' : '⚠️'}`);
    console.log(`   • Client Satisfaction: ${metrics.client_satisfaction.toFixed(1)}/5 ${metrics.client_satisfaction > 4 ? '✅' : '⚠️'}`);
    console.log(`   • Distance: ${selected.distance}km ${selected.distance < 20 ? '✅' : '⚠️'}`);
    console.log(`   • Within Budget: €${(installation.estimated_hours * selected.hourly_rate).toFixed(0)} / €${installation.max_budget} ${(installation.estimated_hours * selected.hourly_rate) <= installation.max_budget ? '✅' : '⚠️'}`);
  }
  
  console.log('\n🥈 TOP CANDIDATES:');
  console.log('-'.repeat(40));
  result.topCandidates.slice(0, 3).forEach((candidate, i) => {
    console.log(`${i + 1}. ${candidate.name} - Score: ${candidate.score}/100`);
    console.log(`   Performance: ${candidate.performance_score?.toFixed(1) || 'N/A'} | Location: ${candidate.location_score?.toFixed(1) || 'N/A'}`);
  });
  
  console.log('\n📊 ALGORITHM PERFORMANCE:');
  console.log(`   ⚡ Execution Time: ${duration}ms`);
  console.log(`   🔍 Partners Evaluated: ${result.evaluation.totalPartnersEvaluated}`);
  console.log(`   ✅ Candidates After Filtering: ${result.evaluation.candidatesAfterFiltering}`);
  
  console.log('\n💡 KEY AI FEATURES DEMONSTRATED:');
  console.log('   ✅ Performance-based prioritization (>70% completion rate)');
  console.log('   ✅ Geographic optimization (Athens 46% concentration)');
  console.log('   ✅ Workload balancing (capacity constraints)');
  console.log('   ✅ Multi-factor scoring (performance + location + cost + specialty)');
  console.log('   ✅ Urgency-aware assignment (critical installations)');
  console.log('   ✅ Budget constraint validation');
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Implement real-time partner availability updates');
  console.log('   2. Add machine learning for performance prediction');
  console.log('   3. Integrate with Softone ERP for live data');
  console.log('   4. Add SEPE compliance validation');
  
  return result;
}

// Export for use in other demos
module.exports = { demonstrateAIAssignment };

// Run demo if called directly
if (require.main === module) {
  demonstrateAIAssignment().catch(console.error);
}