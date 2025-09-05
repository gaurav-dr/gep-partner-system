// Re-export the main WorkflowManager with modular structure
import { Logger } from '../../types';
import { supabaseAdmin } from '../../config/supabase';
import EmailService from '../EmailService';
import { 
    WorkflowDefinition, 
    WorkflowInstance, 
    WorkflowStatus, 
    WorkflowApproval,
    User,
    ApprovalRequestData,
    StepExecutionResult
} from './types';

const logger: Logger = require('../../utils/logger');

/**
 * Workflow Manager
 * Handles approval chains, state transitions, and automated workflows
 * Supports role-based approvals, escalation, and audit trails
 */
class WorkflowManager {
    private emailService: typeof EmailService;
    private workflowDefinitions: Map<string, WorkflowDefinition>;
    private activeWorkflows: Map<string, WorkflowInstance>;

    constructor() {
        this.emailService = EmailService;
        this.workflowDefinitions = new Map();
        this.activeWorkflows = new Map();
        
        // Load workflow definitions on initialization
        this.loadWorkflowDefinitions();
    }

    /**
     * Initialize workflow definitions
     */
    private async loadWorkflowDefinitions(): Promise<void> {
        // This would typically load from database or configuration files
        // For now, we'll define some basic workflows
        
        const approvalWorkflow: WorkflowDefinition = {
            id: 'partner_approval',
            name: 'Partner Approval Process',
            description: 'Standard approval process for partner assignments',
            version: '1.0',
            triggerEvent: 'partner_assignment_created',
            steps: [
                {
                    id: 'initial_review',
                    name: 'Initial Review',
                    type: 'review',
                    order: 1,
                    roles: ['reviewer', 'supervisor'],
                    requiredApprovals: 1,
                    timeoutHours: 24
                },
                {
                    id: 'manager_approval',
                    name: 'Manager Approval',
                    type: 'approval',
                    order: 2,
                    roles: ['manager'],
                    requiredApprovals: 1,
                    timeoutHours: 48
                }
            ],
            onComplete: 'approve_assignment',
            onReject: 'reject_assignment'
        };

        this.workflowDefinitions.set(approvalWorkflow.id, approvalWorkflow);
        logger.info('Workflow definitions loaded', { count: this.workflowDefinitions.size });
    }

    /**
     * Start a new workflow instance
     */
    async startWorkflow(
        definitionId: string,
        entityId: string,
        entityType: string,
        data: Record<string, any>,
        createdBy: string
    ): Promise<string> {
        try {
            const definition = this.workflowDefinitions.get(definitionId);
            if (!definition) {
                throw new Error(`Workflow definition not found: ${definitionId}`);
            }

            const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const instance: WorkflowInstance = {
                id: workflowId,
                workflowDefinitionId: definitionId,
                entityId,
                entityType,
                currentStepId: definition.steps[0].id,
                status: 'in_progress',
                data,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy,
                priority: 'medium'
            };

            // Store in database
            const { error } = await supabaseAdmin
                .from('workflows')
                .insert({
                    id: workflowId,
                    definition_id: definitionId,
                    entity_id: entityId,
                    entity_type: entityType,
                    current_step_id: definition.steps[0].id,
                    status: 'in_progress',
                    workflow_data: data,
                    created_by: createdBy,
                    priority: 'medium'
                });

            if (error) {
                throw new Error(`Failed to create workflow: ${error.message}`);
            }

            this.activeWorkflows.set(workflowId, instance);

            // Execute first step
            await this.executeStep(workflowId, definition.steps[0].id);

            logger.info('Workflow started successfully', { 
                workflowId, 
                definitionId, 
                entityId, 
                entityType 
            });

            return workflowId;
        } catch (error) {
            logger.error('Failed to start workflow:', { 
                definitionId, 
                entityId, 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Execute a workflow step
     */
    private async executeStep(workflowId: string, stepId: string): Promise<StepExecutionResult> {
        try {
            const instance = this.activeWorkflows.get(workflowId) || await this.loadWorkflowInstance(workflowId);
            const definition = this.workflowDefinitions.get(instance.workflowDefinitionId);
            
            if (!definition) {
                throw new Error('Workflow definition not found');
            }

            const step = definition.steps.find(s => s.id === stepId);
            if (!step) {
                throw new Error(`Step not found: ${stepId}`);
            }

            // Execute step based on type
            switch (step.type) {
                case 'approval':
                case 'review':
                    return await this.executeApprovalStep(instance, step);
                case 'automated':
                    return await this.executeAutomatedStep(instance, step);
                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }
        } catch (error) {
            logger.error('Step execution failed:', { workflowId, stepId, error: (error as Error).message });
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Execute approval step
     */
    private async executeApprovalStep(instance: WorkflowInstance, step: any): Promise<StepExecutionResult> {
        try {
            // Find eligible approvers
            const approvers = await this.findEligibleApprovers(step.roles || [], instance);
            
            if (approvers.length === 0) {
                return { success: false, error: 'No eligible approvers found' };
            }

            // Send approval requests
            for (const approver of approvers) {
                await this.sendApprovalRequest(instance, step, approver);
            }

            // Update workflow status
            await this.updateWorkflowStatus(instance.id, 'pending', step.id);

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Execute automated step
     */
    private async executeAutomatedStep(instance: WorkflowInstance, step: any): Promise<StepExecutionResult> {
        // Placeholder for automated step execution
        logger.info('Executing automated step', { workflowId: instance.id, stepId: step.id });
        
        // Move to next step
        const definition = this.workflowDefinitions.get(instance.workflowDefinitionId);
        const nextStep = this.getNextStep(definition!, step.id);
        
        return { 
            success: true, 
            nextStepId: nextStep?.id,
            completed: !nextStep 
        };
    }

    /**
     * Get workflow status
     */
    async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus | null> {
        try {
            const instance = this.activeWorkflows.get(workflowId) || await this.loadWorkflowInstance(workflowId);
            const definition = this.workflowDefinitions.get(instance.workflowDefinitionId);
            
            if (!definition) {
                return null;
            }

            const currentStep = definition.steps.find(s => s.id === instance.currentStepId);
            const completedSteps = definition.steps.filter(s => s.order < (currentStep?.order || 0)).length;
            
            return {
                workflowInstanceId: workflowId,
                currentStep: {
                    id: currentStep?.id || '',
                    name: currentStep?.name || '',
                    type: currentStep?.type || '',
                    status: instance.status
                },
                progress: {
                    completedSteps,
                    totalSteps: definition.steps.length,
                    percentage: (completedSteps / definition.steps.length) * 100
                },
                pendingApprovals: [],
                history: [],
                isOverdue: false,
                canUserAct: true,
                availableActions: ['approve', 'reject']
            };
        } catch (error) {
            logger.error('Failed to get workflow status:', { workflowId, error: (error as Error).message });
            return null;
        }
    }

    // Helper methods
    private async loadWorkflowInstance(workflowId: string): Promise<WorkflowInstance> {
        const { data, error } = await supabaseAdmin
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (error || !data) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        return {
            id: data.id,
            workflowDefinitionId: data.definition_id,
            entityId: data.entity_id,
            entityType: data.entity_type,
            currentStepId: data.current_step_id,
            status: data.status,
            data: data.workflow_data,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            createdBy: data.created_by,
            priority: data.priority
        };
    }

    private async updateWorkflowStatus(workflowId: string, status: string, currentStepId?: string): Promise<void> {
        const updates: any = { 
            status, 
            updated_at: new Date().toISOString() 
        };
        
        if (currentStepId) {
            updates.current_step_id = currentStepId;
        }

        await supabaseAdmin
            .from('workflows')
            .update(updates)
            .eq('id', workflowId);
    }

    private getNextStep(definition: WorkflowDefinition, currentStepId: string): any | null {
        const currentStep = definition.steps.find(s => s.id === currentStepId);
        if (!currentStep) return null;
        
        const nextStep = definition.steps.find(s => s.order === currentStep.order + 1);
        return nextStep || null;
    }

    private async findEligibleApprovers(roles: string[], workflow: WorkflowInstance): Promise<User[]> {
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, email, name, role, is_active')
            .in('role', roles)
            .eq('is_active', true);

        return error ? [] : (users || []);
    }

    private async sendApprovalRequest(workflow: WorkflowInstance, step: any, approver: User): Promise<void> {
        // Send email notification
        await this.emailService.sendApprovalRequest({
            to: approver.email,
            approverName: approver.name,
            workflowId: workflow.id,
            stepName: step.name,
            entityType: workflow.entityType,
            entityId: workflow.entityId,
            priority: workflow.priority || 'medium',
            description: `Approval required for ${workflow.entityType}: ${workflow.entityId}`
        });

        logger.info('Approval request sent', { 
            workflowId: workflow.id, 
            approver: approver.email, 
            step: step.name 
        });
    }
}

export default WorkflowManager;
export * from './types';