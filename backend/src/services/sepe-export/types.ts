export interface SEPEFilters {
  startDate?: string;
  endDate?: string;
  partnerIds?: string[];
  installationCodes?: string[];
  serviceTypes?: string[];
  activeOnly?: boolean;
  specialties?: string[];
}

export interface VisitData {
  installation_code: string;
  company_name: string;
  tax_number: string;
  address: string;
  city: string;
  postal_code: string;
  employees_count: number;
  risk_category: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  service_type: string;
  partner_name: string;
  partner_license: string;
  partner_specialty: string;
  notes: string;
  status: string;
}

export interface PartnerData {
  partner_id: string;
  full_name: string;
  tax_number: string;
  social_security_number: string;
  license_number: string;
  specialty: string;
  license_issued_date: string;
  license_expiry_date: string;
  address: string;
  phone: string;
  email: string;
  status: string;
  activation_date: string;
}

export interface MonthlySummaryData {
  totalVisits: number;
  totalServiceHours: string;
  activePartners: number;
  visitedInstallations: number;
  averageHoursPerVisit: string;
  complianceRate: number;
  serviceTypeBreakdown: ServiceTypeBreakdown[];
}

export interface ServiceTypeBreakdown {
  type: string;
  visits: number;
  hours: number;
  average: string;
}

export interface ComplianceData {
  totalInstallations: number;
  compliantInstallations: number;
  nonCompliantInstallations: number;
  overallComplianceRate: string;
  installations: ComplianceInstallation[];
}

export interface ComplianceInstallation {
  installation_code: string;
  company_name: string;
  category: string;
  required_hours: number;
  actual_hours: string;
  compliant: boolean;
  notes: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  filepath: string;
  recordCount?: number;
  summary?: any;
  downloadUrl: string;
  complianceRate?: string;
}

export interface ExportSummary {
  totalVisits: number;
  totalPartners: number;
  totalInstallations: number;
  dateRange: { start: string; end: string };
  exportDuration: number;
}

export interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface DatabaseVisit {
  id: string;
  schedule_id: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  visit_type: string;
  status: string;
  notes?: string;
  special_requirements?: string;
  created_at: string;
  updated_at: string;
  schedules: {
    installation_code: string;
    service_type: string;
    partner_id: string;
    installations: {
      company_name: string;
      address: string;
      employees_count: number;
      service_type: string;
    };
    partners: {
      name: string;
      email: string;
      phone?: string;
      specialties: string[];
      hourly_rate: number;
    };
  };
}

export interface DatabasePartner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialties: string[];
  hourly_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseInstallation {
  installation_code: string;
  company_name: string;
  address: string;
  employees_count: number;
  service_type: string;
  required_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}