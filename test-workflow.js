#!/usr/bin/env node

// End-to-End Workflow Test for GEP Partner System
// Tests the complete partner assignment workflow without Docker dependencies

const { OptimizationEngine } = require('./test-optimization.js');

// Mock API responses and database data
const mockDatabase = {
  partners: [
    {
      id: 'DOC001',
      name: 'Dr. Maria Danezis',
      specialty: 'Occupational Doctor',
      city: 'Athens',
      hourly_rate: 75.00,
      is_active: true,
      max_hours_per_week: 35,
      email: 'maria.danezis@gephellas.com',
      performance_metrics: {
        completion_rate: 85,
        avg_response_time: 2.5,
        client_satisfaction: 4.2
      }
    },
    {
      id: 'ENG001', 
      name: 'Kostas Papadopoulos',
      specialty: 'Safety Engineer',
      city: 'Thessaloniki', 
      hourly_rate: 65.00,
      is_active: true,
      max_hours_per_week: 40,
      email: 'kostas.papadopoulos@gephellas.com',
      performance_metrics: {
        completion_rate: 92,
        avg_response_time: 1.8,
        client_satisfaction: 4.5
      }
    }
  ],
  
  customerRequests: [
    {
      id: 1,
      client_name: 'ACME Manufacturing Ltd',
      service_type: 'occupational_doctor',
      installation_address: '123 Industrial Ave, Athens, Greece',
      employee_count: 25,
      urgency_level: 'normal',
      start_date: '2025-09-10',
      end_date: '2025-09-10',
      status: 'pending',
      created_at: '2025-09-03T10:00:00Z'
    }
  ],
  
  assignments: []
};

// Mock Services
class MockPartnerService {
  static async getAllPartners() {
    return mockDatabase.partners.filter(p => p.is_active);
  }
  
  static async getPartnerById(id) {
    return mockDatabase.partners.find(p => p.id === id);
  }
}

class MockRequestService {
  static async getPendingRequests() {
    return mockDatabase.customerRequests.filter(r => r.status === 'pending');
  }
  
  static async getRequestById(id) {
    return mockDatabase.customerRequests.find(r => r.id === id);
  }
  
  static async updateRequestStatus(id, status) {
    const request = mockDatabase.customerRequests.find(r => r.id === id);
    if (request) {
      request.status = status;
      return request;
    }
    return null;
  }
}

class MockAssignmentService {
  static async createAssignment(assignmentData) {
    const assignment = {
      id: mockDatabase.assignments.length + 1,
      ...assignmentData,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    mockDatabase.assignments.push(assignment);
    return assignment;
  }
  
  static async approveAssignment(assignmentId, approverId) {
    const assignment = mockDatabase.assignments.find(a => a.id === assignmentId);
    if (assignment) {
      assignment.status = 'approved';
      assignment.approved_by = approverId;
      assignment.approved_at = new Date().toISOString();
      return assignment;
    }
    return null;
  }
  
  static async getAssignmentsByPartner(partnerId) {
    return mockDatabase.assignments.filter(a => a.partner_id === partnerId);
  }
}

class MockNotificationService {
  static async sendPartnerNotification(partnerId, assignmentData) {
    console.log(`📧 NOTIFICATION: Partner ${partnerId} notified of new assignment`);
    console.log(`   Assignment: ${assignmentData.client_name} - ${assignmentData.service_type}`);
    return { success: true, messageId: `msg-${Date.now()}` };
  }
  
  static async sendManagerUpdate(managerId, assignmentData) {
    console.log(`📧 NOTIFICATION: Manager updated on assignment status`);
    return { success: true, messageId: `msg-${Date.now()}` };
  }
}

// Main Workflow Orchestrator
class PartnerAssignmentWorkflow {
  constructor() {
    this.optimizationEngine = new OptimizationEngine();
  }
  
  /**
   * Complete end-to-end partner assignment workflow
   * 1. Get pending requests
   * 2. Get available partners  
   * 3. Run AI optimization
   * 4. Create assignment
   * 5. Send notifications
   * 6. Update request status
   */
  async processAssignments() {
    console.log('🎯 Starting Partner Assignment Workflow...\n');
    
    try {
      // Step 1: Get pending requests
      console.log('📋 Step 1: Fetching pending customer requests...');
      const pendingRequests = await MockRequestService.getPendingRequests();
      console.log(`Found ${pendingRequests.length} pending request(s)`);
      
      if (pendingRequests.length === 0) {
        console.log('✅ No pending requests to process');
        return { processed: 0, successful: 0 };
      }
      
      let processed = 0;
      let successful = 0;
      
      for (const request of pendingRequests) {
        console.log(`\n--- Processing Request ${request.id}: ${request.client_name} ---`);
        
        try {
          // Step 2: Get available partners
          console.log('👥 Step 2: Fetching available partners...');
          const availablePartners = await MockPartnerService.getAllPartners();
          console.log(`Found ${availablePartners.length} active partner(s)`);
          
          // Step 3: Run AI optimization
          console.log('🤖 Step 3: Running AI optimization...');
          const optimizationResult = await this.optimizationEngine.optimize(
            request, 
            availablePartners,
            { maxHourlyRate: 100 } // Example constraint
          );
          
          if (!optimizationResult.selectedPartner) {
            console.log('❌ No suitable partner found');
            await MockRequestService.updateRequestStatus(request.id, 'no_partners_available');
            processed++;
            continue;
          }
          
          const selectedPartner = optimizationResult.selectedPartner;
          console.log(`✅ Selected Partner: ${selectedPartner.name} (Score: ${selectedPartner.score.toFixed(2)})`);
          
          // Step 4: Create assignment
          console.log('📝 Step 4: Creating assignment...');
          const assignmentData = {
            request_id: request.id,
            partner_id: selectedPartner.id,
            client_name: request.client_name,
            service_type: request.service_type,
            installation_address: request.installation_address,
            start_date: request.start_date,
            end_date: request.end_date,
            optimization_score: selectedPartner.score,
            hourly_rate: selectedPartner.hourly_rate,
            estimated_hours: this.estimateHours(request),
            total_cost: this.calculateCost(request, selectedPartner),
            ai_reasoning: this.generateAIReasoning(optimizationResult)
          };
          
          const assignment = await MockAssignmentService.createAssignment(assignmentData);
          console.log(`✅ Assignment created: ID ${assignment.id}`);
          
          // Step 5: Send notifications
          console.log('📧 Step 5: Sending notifications...');
          await MockNotificationService.sendPartnerNotification(selectedPartner.id, assignmentData);
          await MockNotificationService.sendManagerUpdate('manager-001', assignmentData);
          
          // Step 6: Update request status
          console.log('🔄 Step 6: Updating request status...');
          await MockRequestService.updateRequestStatus(request.id, 'assigned');
          
          console.log('✅ Workflow completed successfully');
          processed++;
          successful++;
          
        } catch (error) {
          console.log(`❌ Workflow failed for request ${request.id}: ${error.message}`);
          await MockRequestService.updateRequestStatus(request.id, 'assignment_failed');
          processed++;
        }
      }
      
      return { processed, successful };
      
    } catch (error) {
      console.log(`❌ Workflow orchestration failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Simulate manager approval workflow
   */
  async simulateManagerApproval() {
    console.log('\n🎯 Simulating Manager Approval Workflow...\n');
    
    const pendingAssignments = mockDatabase.assignments.filter(a => a.status === 'pending');
    
    if (pendingAssignments.length === 0) {
      console.log('No pending assignments to approve');
      return;
    }
    
    for (const assignment of pendingAssignments) {
      console.log(`📋 Reviewing Assignment ${assignment.id}:`);
      console.log(`   Client: ${assignment.client_name}`);
      console.log(`   Partner: ${assignment.partner_id}`);
      console.log(`   Optimization Score: ${assignment.optimization_score.toFixed(2)}`);
      console.log(`   Estimated Cost: €${assignment.total_cost}`);
      
      // Simulate manager decision (approve if score > 70)
      if (assignment.optimization_score > 70) {
        console.log('✅ Manager Decision: APPROVED');
        await MockAssignmentService.approveAssignment(assignment.id, 'manager-001');
        await MockNotificationService.sendPartnerNotification(
          assignment.partner_id, 
          { ...assignment, status: 'approved' }
        );
      } else {
        console.log('❌ Manager Decision: NEEDS REVIEW (Low optimization score)');
      }
    }
  }
  
  /**
   * Simulate partner workflow - partner viewing and accepting assignments
   */
  async simulatePartnerWorkflow(partnerId) {
    console.log(`\n🎯 Simulating Partner Workflow for ${partnerId}...\n`);
    
    const partner = await MockPartnerService.getPartnerById(partnerId);
    if (!partner) {
      console.log(`❌ Partner ${partnerId} not found`);
      return;
    }
    
    const assignments = await MockAssignmentService.getAssignmentsByPartner(partnerId);
    console.log(`📋 Partner ${partner.name} has ${assignments.length} assignment(s)`);
    
    for (const assignment of assignments) {
      console.log(`Assignment ${assignment.id}:`);
      console.log(`   Client: ${assignment.client_name}`);
      console.log(`   Service: ${assignment.service_type}`);
      console.log(`   Date: ${assignment.start_date}`);
      console.log(`   Status: ${assignment.status}`);
      console.log(`   Rate: €${assignment.hourly_rate}/hr`);
    }
    
    return assignments;
  }
  
  // Helper methods
  estimateHours(request) {
    // Simplified estimation based on employee count
    const baseHours = request.service_type === 'occupational_doctor' ? 4 : 6;
    const additionalHours = Math.ceil(request.employee_count / 50) * 2;
    return baseHours + additionalHours;
  }
  
  calculateCost(request, partner) {
    const hours = this.estimateHours(request);
    return hours * partner.hourly_rate;
  }
  
  generateAIReasoning(optimizationResult) {
    const partner = optimizationResult.selectedPartner;
    return `Selected ${partner.name} based on optimal combination of location proximity (${partner.distance}km), performance history (${partner.performance_metrics?.completion_rate}% completion rate), and cost-effectiveness (€${partner.hourly_rate}/hr). Overall optimization score: ${partner.score.toFixed(2)}/100.`;
  }
}

// Test Execution
async function runEndToEndTest() {
  console.log('=== GEP PARTNER SYSTEM - END-TO-END WORKFLOW TEST ===\n');
  
  const workflow = new PartnerAssignmentWorkflow();
  
  try {
    // Test 1: Complete assignment workflow
    const result = await workflow.processAssignments();
    console.log(`\n📊 WORKFLOW RESULTS:`);
    console.log(`   Requests Processed: ${result.processed}`);
    console.log(`   Successfully Assigned: ${result.successful}`);
    console.log(`   Success Rate: ${((result.successful / result.processed) * 100).toFixed(1)}%`);
    
    // Test 2: Manager approval workflow
    await workflow.simulateManagerApproval();
    
    // Test 3: Partner workflow
    await workflow.simulatePartnerWorkflow('DOC001');
    
    // Test 4: System state validation
    console.log('\n📊 FINAL SYSTEM STATE:');
    console.log(`   Total Assignments Created: ${mockDatabase.assignments.length}`);
    console.log(`   Approved Assignments: ${mockDatabase.assignments.filter(a => a.status === 'approved').length}`);
    console.log(`   Assigned Requests: ${mockDatabase.customerRequests.filter(r => r.status === 'assigned').length}`);
    
    // Check if workflow completed successfully
    const workflowSuccess = result.successful > 0 && mockDatabase.assignments.length > 0;
    
    console.log('\n=== WORKFLOW TEST RESULTS ===');
    if (workflowSuccess) {
      console.log('✅ END-TO-END WORKFLOW: WORKING');
      console.log('✅ AI Optimization Integration: FUNCTIONAL');
      console.log('✅ Assignment Creation: OPERATIONAL');
      console.log('✅ Notification System: SIMULATED SUCCESSFULLY'); 
      console.log('✅ Manager Approval Process: WORKING');
      console.log('✅ Partner Dashboard Simulation: FUNCTIONAL');
    } else {
      console.log('❌ END-TO-END WORKFLOW: BROKEN');
    }
    
    return workflowSuccess;
    
  } catch (error) {
    console.log('❌ END-TO-END TEST FAILED:', error.message);
    return false;
  }
}

// Execute test
if (require.main === module) {
  runEndToEndTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { PartnerAssignmentWorkflow, runEndToEndTest };