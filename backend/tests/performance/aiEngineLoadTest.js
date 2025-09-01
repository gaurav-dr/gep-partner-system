/**
 * AI Engine Performance Load Tests
 * Tests scalability with 100-1000 partners
 */

const OptimizationEngine = require('../../src/services/OptimizationEngine');
const TestDataFactory = require('../factories/testDataFactory');

// Mock logger for performance testing
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

class PerformanceProfiler {
  constructor() {
    this.results = [];
  }

  async measureMemoryUsage() {
    const used = process.memoryUsage();
    return {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(used.external / 1024 / 1024 * 100) / 100, // MB
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 // MB
    };
  }

  async profileOptimization(partnerCount, testName = '') {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startMemory = await this.measureMemoryUsage();
    console.log(`\n🧪 ${testName || `Testing ${partnerCount} partners`}`);
    console.log(`📊 Memory before: ${startMemory.heapUsed}MB heap, ${startMemory.rss}MB RSS`);

    const testDataFactory = new TestDataFactory();
    const optimizationEngine = new OptimizationEngine();

    // Generate realistic test data
    console.log(`📝 Generating ${partnerCount} realistic partners...`);
    const dataGenStart = Date.now();
    const partners = testDataFactory.generatePartners(partnerCount);
    const installation = testDataFactory.generateInstallations(1, { urgency_level: 'high' })[0];
    const dataGenTime = Date.now() - dataGenStart;

    const afterDataGenMemory = await this.measureMemoryUsage();
    console.log(`⚡ Data generation: ${dataGenTime}ms`);
    console.log(`💾 Memory after data gen: ${afterDataGenMemory.heapUsed}MB heap (+${(afterDataGenMemory.heapUsed - startMemory.heapUsed).toFixed(2)}MB)`);

    // Warm up (single run to eliminate JIT compilation overhead)
    await optimizationEngine.optimize(installation, partners.slice(0, Math.min(10, partnerCount)));

    // Performance test runs
    const iterations = partnerCount <= 100 ? 10 : (partnerCount <= 500 ? 5 : 3);
    const executionTimes = [];
    
    console.log(`🚀 Running ${iterations} optimization iterations...`);
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const result = await optimizationEngine.optimize(installation, partners);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      executionTimes.push(executionTime);
      
      // Verify result quality
      if (!result.selectedPartner) {
        console.warn(`⚠️  Iteration ${i + 1}: No partner selected`);
      }
      
      process.stdout.write(`${i + 1}.`);
    }

    console.log(' ✅ Complete');

    // Calculate statistics
    const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    const minTime = Math.min(...executionTimes);
    const maxTime = Math.max(...executionTimes);
    const medianTime = executionTimes.sort((a, b) => a - b)[Math.floor(executionTimes.length / 2)];

    // Final memory measurement
    const endMemory = await this.measureMemoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Calculate performance metrics
    const partnersPerMs = partnerCount / avgTime;
    const partnersPerSecond = partnersPerMs * 1000;

    const profileResult = {
      partnerCount,
      testName,
      dataGenTime,
      iterations,
      executionTimes,
      avgTime: Math.round(avgTime * 100) / 100,
      minTime,
      maxTime,
      medianTime,
      partnersPerMs: Math.round(partnersPerMs * 100) / 100,
      partnersPerSecond: Math.round(partnersPerSecond),
      memory: {
        start: startMemory,
        afterDataGen: afterDataGenMemory,
        end: endMemory,
        delta: Math.round(memoryDelta * 100) / 100,
        dataGenDelta: Math.round((afterDataGenMemory.heapUsed - startMemory.heapUsed) * 100) / 100
      }
    };

    this.results.push(profileResult);
    this.displayResults(profileResult);
    
    return profileResult;
  }

  displayResults(result) {
    console.log('\n📊 PERFORMANCE RESULTS');
    console.log('=' .repeat(50));
    console.log(`🎯 Partners: ${result.partnerCount}`);
    console.log(`⚡ Avg Time: ${result.avgTime}ms`);
    console.log(`🏃 Speed: ${result.partnersPerSecond} partners/second`);
    console.log(`📈 Range: ${result.minTime}ms - ${result.maxTime}ms`);
    console.log(`📊 Median: ${result.medianTime}ms`);
    console.log(`💾 Memory: +${result.memory.delta}MB (data: +${result.memory.dataGenDelta}MB)`);
    console.log(`📝 Per Partner: ${(result.avgTime / result.partnerCount).toFixed(3)}ms`);
  }

  displaySummary() {
    console.log('\n🎯 PERFORMANCE SUMMARY');
    console.log('=' .repeat(80));
    console.log('Partners | Avg Time | Partners/Sec | Memory +MB | Per Partner');
    console.log('-' .repeat(80));
    
    this.results.forEach(result => {
      const perPartner = (result.avgTime / result.partnerCount).toFixed(3);
      console.log(
        `${result.partnerCount.toString().padStart(8)} | ` +
        `${result.avgTime.toString().padStart(8)}ms | ` +
        `${result.partnersPerSecond.toString().padStart(12)} | ` +
        `${result.memory.delta.toString().padStart(10)} | ` +
        `${perPartner}ms`
      );
    });

    console.log('\n📈 SCALABILITY ANALYSIS');
    console.log('-' .repeat(40));
    
    if (this.results.length >= 2) {
      const smallResult = this.results[0];
      const largeResult = this.results[this.results.length - 1];
      
      const scalabilityFactor = largeResult.partnerCount / smallResult.partnerCount;
      const timeIncreaseFactor = largeResult.avgTime / smallResult.avgTime;
      const efficiency = scalabilityFactor / timeIncreaseFactor;
      
      console.log(`📊 Scale Factor: ${scalabilityFactor}x partners`);
      console.log(`⏱️  Time Factor: ${timeIncreaseFactor.toFixed(2)}x slower`);
      console.log(`🚀 Efficiency: ${(efficiency * 100).toFixed(1)}% (100% = linear scaling)`);
      
      if (efficiency > 0.8) {
        console.log('✅ Excellent scalability - nearly linear performance');
      } else if (efficiency > 0.6) {
        console.log('⚡ Good scalability - acceptable performance degradation');
      } else {
        console.log('⚠️  Performance degradation detected - optimization needed');
      }
    }
  }

  async runComprehensiveTest() {
    console.log('🚀 AI ENGINE COMPREHENSIVE LOAD TEST');
    console.log('=' .repeat(60));
    console.log('Testing partner assignment optimization at scale');
    
    // Test different scales
    const testSizes = [100, 250, 500, 750, 1000];
    
    for (const size of testSizes) {
      await this.profileOptimization(size);
      
      // Brief pause between tests to allow GC
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.displaySummary();
    
    // Generate recommendations
    this.generateRecommendations();
    
    return this.results;
  }

  generateRecommendations() {
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS');
    console.log('=' .repeat(50));
    
    const largestTest = this.results[this.results.length - 1];
    
    if (largestTest.avgTime < 100) {
      console.log('✅ Excellent: Ready for production with 1000+ partners');
    } else if (largestTest.avgTime < 500) {
      console.log('✅ Good: Suitable for production, consider caching for 1000+ partners');
    } else {
      console.log('⚠️  Consider optimization for large partner pools');
    }
    
    console.log('\n🎯 Production Deployment Estimates:');
    console.log(`   • Real-time assignment: Up to ${Math.floor(1000 / (largestTest.avgTime / 1000))} partners`);
    console.log(`   • Batch processing: ${largestTest.partnersPerSecond * 60} partners/minute`);
    console.log(`   • Memory per 1000 partners: ~${largestTest.memory.delta}MB`);
    
    console.log('\n🔧 Optimization Opportunities:');
    console.log('   • Partner pre-filtering based on availability');
    console.log('   • Geographic indexing for location scoring');
    console.log('   • Caching of performance metrics');
    console.log('   • Parallel processing for independent calculations');
  }
}

async function runLoadTests() {
  const profiler = new PerformanceProfiler();
  
  // Enable garbage collection if available (run with --expose-gc)
  if (process.argv.includes('--expose-gc')) {
    console.log('🗑️  Garbage collection enabled for accurate memory profiling');
  }
  
  return await profiler.runComprehensiveTest();
}

// Export for use in other tests
module.exports = { PerformanceProfiler, runLoadTests };

// Run load tests if called directly
if (require.main === module) {
  runLoadTests().catch(console.error);
}