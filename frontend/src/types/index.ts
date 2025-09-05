// Global type definitions for the GEP Partner Assignment System

// Re-export API types for easy access
export type { CustomerRequest, Partner, Assignment, OptimizationResult } from '../services/api';

// User and Authentication types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'partner';
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

// Dashboard and Analytics types
export interface DashboardStats {
  totalRequests: number;
  activePartners: number;
  pendingAssignments: number;
  completedThisMonth: number;
}

export interface AnalyticsData {
  utilizationMetrics: UtilizationMetric[];
  costMetrics: CostMetric[];
  performanceMetrics: PerformanceMetric[];
}

export interface UtilizationMetric {
  partnerId: string;
  partnerName: string;
  hoursAssigned: number;
  maxHours: number;
  utilizationRate: number;
  period: string;
}

export interface CostMetric {
  period: string;
  totalCost: number;
  averageHourlyRate: number;
  costPerRequest: number;
  budgetUtilization: number;
}

export interface PerformanceMetric {
  partnerId: string;
  partnerName: string;
  responseTime: number;
  completionRate: number;
  satisfactionScore?: number;
  period: string;
}

// Form and UI types
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string | number;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: keyof T | ((record: T) => string);
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Filter and Search types
export interface FilterState {
  search?: string;
  status?: string[];
  dateRange?: [Date, Date];
  partnerId?: string;
  serviceType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
  type?: 'primary' | 'secondary';
}

// Calendar and Scheduling types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type?: 'assignment' | 'availability' | 'unavailable';
  partnerId?: string;
  requestId?: number;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface AvailabilitySlot {
  dayOfWeek: number; // 0-6, Sunday-Saturday
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
}

export interface PartnerAvailability {
  partnerId: string;
  regularSlots: AvailabilitySlot[];
  exceptions: {
    date: string; // YYYY-MM-DD format
    isAvailable: boolean;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }[];
}

// Utility types for better type safety
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OmitField<T, K extends keyof T> = Omit<T, K>;

// Status types used throughout the application
export type RequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type AssignmentStatus =
  | 'proposed'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PartnerStatus = 'active' | 'inactive' | 'suspended';

// Service types
export type ServiceType = 'occupational_doctor' | 'safety_engineer';

// Supported languages for internationalization (if needed in the future)
export type SupportedLocale = 'en' | 'es' | 'fr' | 'de';

// Environment types
export type Environment = 'development' | 'staging' | 'production';
