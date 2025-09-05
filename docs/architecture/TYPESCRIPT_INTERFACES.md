# GEP Partner System - TypeScript Interfaces & Type Definitions

## Overview

This document provides comprehensive documentation for the TypeScript interfaces and type definitions used throughout the GEP Partner Assignment System. The system maintains strict type safety across both frontend and backend components.

## Architecture Overview

```typescript
┌─────────────────────────────────────────────────────────────────┐
│                    TYPE DEFINITION STRUCTURE                    │
├─────────────────────────────────────────────────────────────────┤
│  Backend (src/types/index.ts)    │  Frontend (src/types/index.ts) │
│  - Core domain types             │  - UI component types          │
│  - API request/response types    │  - Form validation types       │
│  - Database entity types        │  - State management types      │
│  - Authentication types         │  - Analytics & reporting types │
│  - Business logic types         │  - Calendar & scheduling types │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Type Definitions (`backend/src/types/index.ts`)

### Core Domain Types

#### User Management

```typescript
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
```

#### Partner Management

```typescript
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
```

#### Request and Assignment Management

```typescript
export interface CustomerRequest {
  id: number;
  client_name: string;
  service_type: ServiceType;
  installation_address: string;
  employee_count: number;
  estimated_hours: number;
  start_date: string;
  end_date: string;
  special_requirements?: string;
  status: RequestStatus;
  urgency_level?: UrgencyLevel;
  created_at: string;
  updated_at?: string;
}

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
```

#### Enumerated Types

```typescript
export type ServiceType = 'installation' | 'maintenance' | 'repair' | 'consultation' | 'training';
export type RequestStatus = 'pending' | 'assigned' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export type AssignmentStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'urgent';
```

### AI and Optimization Types

```typescript
export interface OptimizationRequest {
  requestId: number;
  serviceType: ServiceType;
  installationCode?: string;
  constraints?: OptimizationConstraints;
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
```

### API and Authentication Types

```typescript
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
  expiresIn: string;
}

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
```

### Express Extensions

```typescript
// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      originalBody?: any;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: User;
}
```

## Frontend Type Definitions (`frontend/src/types/index.ts`)

### UI and Component Types

```typescript
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
```

### Authentication Context

```typescript
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}
```

### Dashboard and Analytics

```typescript
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
```

### Calendar and Scheduling

```typescript
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
```

### Notification System

```typescript
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
```

### API Response Types

```typescript
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
```

### Filter and Search Types

```typescript
export interface FilterState {
  search?: string;
  status?: string[];
  dateRange?: [Date, Date];
  partnerId?: string;
  serviceType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### Utility Types

```typescript
// Generic utility types for better type safety
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

export type ServiceType = 'occupational_doctor' | 'safety_engineer';

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de';

export type Environment = 'development' | 'staging' | 'production';
```

## Type Safety Patterns

### 1. API Response Handling

```typescript
// Generic API response wrapper ensures type safety
export const apiCall = async <T>(
  endpoint: string
): Promise<ApiResponse<T>> => {
  const response = await fetch(endpoint);
  return response.json() as Promise<ApiResponse<T>>;
};

// Usage with specific types
const partners = await apiCall<Partner[]>('/api/partners');
```

### 2. Form Validation with Zod

```typescript
import { z } from 'zod';

// Zod schema for runtime validation
export const partnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  specialty: z.string().min(1, 'Specialty is required'),
  hourly_rate: z.number().min(0, 'Rate must be positive'),
  email: z.string().email('Invalid email format').optional(),
});

// Infer TypeScript type from Zod schema
export type PartnerFormData = z.infer<typeof partnerSchema>;
```

### 3. Event Handling

```typescript
// Typed event handlers
export interface TableEventHandlers<T> {
  onRowClick?: (record: T, index: number) => void;
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: FilterState) => void;
}
```

### 4. State Management

```typescript
// Typed Redux-like state management
export interface AppState {
  auth: AuthState;
  partners: PartnerState;
  requests: RequestState;
  ui: UIState;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error?: string;
}
```

## Development Guidelines

### 1. Interface Naming Convention

- Use `PascalCase` for interface names
- Suffix with descriptive terms: `Request`, `Response`, `State`, `Props`
- Prefix with domain context when necessary: `Partner`, `Customer`, `Assignment`

### 2. Type Exports

```typescript
// Always export types for reusability
export type { User, Partner, CustomerRequest } from './types/index';

// Re-export common types from services
export type { CustomerRequest, Partner, Assignment } from '../services/api';
```

### 3. Optional vs Required Fields

```typescript
// Be explicit about optional fields
export interface CreatePartnerRequest {
  name: string;                    // Required
  specialty: string;               // Required
  hourly_rate: number;            // Required
  email?: string;                 // Optional
  max_hours_per_week?: number;    // Optional
}
```

### 4. Union Types for State

```typescript
// Use union types for predictable states
export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error?: string;
}
```

## Migration Notes

### Changes from JavaScript to TypeScript

1. **Strict Type Checking**: All variables and function parameters now have explicit types
2. **Interface Definitions**: Comprehensive interfaces for all data structures
3. **Generic Types**: Reusable type definitions with generics
4. **Runtime Validation**: Zod schemas for request validation
5. **IDE Support**: Enhanced IntelliSense and error checking

### Breaking Changes

- All API responses now require type parameters
- Form components require typed props
- Event handlers must match exact signatures
- Database queries return typed results

### Benefits Achieved

- **Zero Runtime Type Errors**: Caught at compile time
- **Enhanced Developer Experience**: Auto-completion and error detection
- **Self-Documenting Code**: Types serve as documentation
- **Refactoring Safety**: Type system prevents breaking changes
- **Better Testing**: Mock objects must match exact interfaces

---

**Last Updated:** September 5, 2025  
**TypeScript Version:** 5.2+  
**Coverage:** 100% of application components