export interface StepCondition {
  type: 'user_role' | 'approval_count' | 'custom';
  value: any;
  operator?: 'equals' | 'greater_than' | 'less_than' | 'contains';
  field?: string;
}

export interface StepActions {
  onApprove?: {
    action: string;
    parameters?: Record<string, any>;
  };
  onReject?: {
    action: string;
    parameters?: Record<string, any>;
  };
  onTimeout?: {
    action: string;
    parameters?: Record<string, any>;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  type: 'approval' | 'review' | 'verification' | 'automated' | 'external_verification';
  order: number;
  roles?: string[];
  requiredApprovals?: number;
  timeoutHours?: number;
  conditions?: StepCondition[];
  actions?: StepActions;
  isParallel?: boolean;
  skipConditions?: StepCondition[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  triggerEvent: string;
  steps: WorkflowStep[];
  onComplete: string;
  onReject: string;
  metadata?: Record<string, any>;
}

export interface WorkflowInstance {
  id: string;
  workflowDefinitionId: string;
  entityId: string;
  entityType: string;
  currentStepId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'timed_out';
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  createdBy: string;
  assignedUsers?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  tags?: string[];
  context?: Record<string, any>;
}

export interface WorkflowApproval {
  id: string;
  workflowInstanceId: string;
  stepId: string;
  userId: string;
  decision: 'approved' | 'rejected' | 'pending';
  comments?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowHistoryEntry {
  id: string;
  workflowInstanceId: string;
  action: string;
  details: Record<string, any>;
  timestamp: Date;
  userId?: string;
}

export interface WorkflowStatus {
  workflowInstanceId: string;
  currentStep: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
  progress: {
    completedSteps: number;
    totalSteps: number;
    percentage: number;
  };
  pendingApprovals: PendingApproval[];
  history: WorkflowHistoryEntry[];
  estimatedCompletion?: Date;
  isOverdue: boolean;
  canUserAct: boolean;
  availableActions: string[];
}

export interface PendingApproval {
  stepId: string;
  stepName: string;
  assignedTo: string[];
  assignedRoles: string[];
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  requiredApprovals: number;
  currentApprovals: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

export interface DatabaseWorkflow {
  id: string;
  definition_id: string;
  entity_id: string;
  entity_type: string;
  current_step_id: string;
  status: string;
  workflow_data: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  created_by: string;
  priority: string;
  due_date?: string;
  tags?: string[];
}

export interface ApprovalRequestData {
  to: string;
  approverName: string;
  workflowId: string;
  stepName: string;
  entityType: string;
  entityId: string;
  dueDate?: string;
  priority: string;
  description: string;
}

export interface StepExecutionResult {
  success: boolean;
  nextStepId?: string;
  completed?: boolean;
  error?: string;
  data?: Record<string, any>;
  notifications?: Array<{
    type: string;
    recipients: string[];
    message: string;
  }>;
}