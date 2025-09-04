// Common types for the GEP Partner System
import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  partner_id?: string;
  client_company_code?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
}

export type UserRole = 'admin' | 'manager' | 'partner' | 'client';

export interface Partner {
  id: string;
  name: string;
  specialty: string;
  city: string;
  hourly_rate: number;
  is_active: boolean;
  max_hours_per_week?: number;
  email?: string;
  performance_metrics?: PerformanceMetrics;
  partner_availability?: AvailabilitySlot[];
  created_at: string;
}

export interface PerformanceMetrics {
  completion_rate: number;
  avg_response_time: number;
  client_satisfaction: number;
}

export interface AvailabilitySlot {
  day_of_week: number;
  available_hours: number;
  booked_hours: number;
  is_available: boolean;
}

export interface CustomerRequest {
  id: number;
  client_name: string;
  service_type: ServiceType;
  installation_address: string;
  employee_count: number;
  start_date: string;
  end_date: string;
  status: RequestStatus;
  urgency_level?: UrgencyLevel;
  created_at: string;
  updated_at?: string;
}

export type ServiceType = 'occupational_doctor' | 'safety_engineer';
export type RequestStatus = 'pending' | 'assigned' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'urgent';

export interface Assignment {
  id: number;
  request_id: number;
  partner_id: string;
  status: AssignmentStatus;
  optimization_score?: number;
  hourly_rate: number;
  estimated_hours: number;
  total_cost: number;
  ai_reasoning?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export type AssignmentStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';

export interface OptimizationRequest {
  requestId: number;
  serviceType: ServiceType;
  installationCode?: string;
  constraints?: OptimizationConstraints;
}

export interface OptimizationConstraints {
  maxBudget?: number;
  maxHourlyRate?: number;
  preferredDays?: string[];
  excludedPartners?: string[];
}

export interface OptimizationResult {
  selectedPartner: Partner | null;
  topCandidates: ScoredPartner[];
  executionTimeMs: number;
  evaluation: {
    totalPartnersEvaluated: number;
    candidatesAfterFiltering: number;
    executionTimeMs: number;
    weights: OptimizationWeights;
    filteringReasons?: FilteringReasons;
  };
}

export interface ScoredPartner extends Partner {
  score: number;
  location_score: number;
  performance_score: number;
  availability_score: number;
  cost_score: number;
  specialty_score: number;
  distance: number;
}

export interface OptimizationWeights {
  location: number;
  availability: number;
  cost: number;
  specialty: number;
  performance: number;
}

export interface FilteringReasons {
  excludedPartners: number;
  specialtyMismatch: number;
  tooExpensive: number;
  notAvailable: number;
}

export interface AuthRequest extends Request {
  user: User;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
  expiresIn: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

// Authentication request interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegistrationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  partnerId?: string;
  clientCompanyCode?: string;
}

export interface LoginResponse extends AuthResponse {}

export interface CreatePartnerRequest {
  name: string;
  specialty: string;
  city: string;
  hourly_rate: number;
  email?: string;
  max_hours_per_week?: number;
}

export interface UpdatePartnerRequest {
  name?: string;
  specialty?: string;
  city?: string;
  hourly_rate?: number;
  email?: string;
  max_hours_per_week?: number;
  is_active?: boolean;
}

export interface CreateCustomerRequestRequest {
  client_name: string;
  service_type: ServiceType;
  installation_address: string;
  employee_count: number;
  start_date: string;
  end_date: string;
  urgency_level?: UrgencyLevel;
}

// Database query result types
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

// Logger interface
export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

// Express extension types  
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};