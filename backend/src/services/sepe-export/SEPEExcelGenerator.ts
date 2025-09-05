import * as ExcelJS from 'exceljs';
import { Logger } from '../../types';

const logger: Logger = require('../../utils/logger');

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

export interface SEPEFilters {
  startDate?: string;
  endDate?: string;
  partnerIds?: string[];
  installationCodes?: string[];
  serviceTypes?: string[];
  activeOnly?: boolean;
  specialties?: string[];
}

/**
 * SEPE Excel Generator
 * Handles basic Excel workbook creation, worksheet setup, and data population
 */
export class SEPEExcelGenerator {
  private fieldMappings: {
    visits: Record<string, string>;
    partners: Record<string, string>;
  };

  constructor() {
    // SEPE field mappings
    this.fieldMappings = {
      visits: {
        'Κωδικός Εγκατάστασης': 'installation_code',
        'Επωνυμία Επιχείρησης': 'company_name',
        'ΑΦΜ': 'tax_number',
        'Διεύθυνση': 'address',
        'Πόλη': 'city',
        'Ταχυδρομικός Κώδικας': 'postal_code',
        'Αριθμός Εργαζομένων': 'employees_count',
        'Κατηγορία Κινδύνου': 'risk_category',
        'Ημερομηνία Επίσκεψης': 'visit_date',
        'Ώρα Έναρξης': 'start_time',
        'Ώρα Λήξης': 'end_time',
        'Διάρκεια (Ώρες)': 'duration_hours',
        'Τύπος Υπηρεσίας': 'service_type',
        'Όνομα Συνεργάτη': 'partner_name',
        'ΑΜ Άδειας Συνεργάτη': 'partner_license',
        'Ειδικότητα': 'partner_specialty',
        'Παρατηρήσεις': 'notes',
        'Κατάσταση': 'status'
      },
      partners: {
        'Κωδικός Συνεργάτη': 'partner_id',
        'Επωνυμία': 'full_name',
        'ΑΦΜ': 'tax_number',
        'ΑΜΚΑ': 'social_security_number',
        'Αριθμός Άδειας': 'license_number',
        'Ειδικότητα': 'specialty',
        'Ημερομηνία Έκδοσης Άδειας': 'license_issued_date',
        'Ημερομηνία Λήξης Άδειας': 'license_expiry_date',
        'Διεύθυνση': 'address',
        'Τηλέφωνο': 'phone',
        'Email': 'email',
        'Κατάσταση': 'status',
        'Ημερομηνία Ενεργοποίησης': 'activation_date'
      }
    };
  }

  /**
   * Create a new Excel workbook
   */
  createWorkbook(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SEPE Export Service';
    workbook.created = new Date();
    return workbook;
  }

  /**
   * Create visits worksheet with headers and data
   */
  createVisitsWorksheet(workbook: ExcelJS.Workbook, visitsData: VisitData[]): ExcelJS.Worksheet {
    const worksheet = workbook.addWorksheet('Επισκέψεις');
    
    // Set up headers
    const headers = Object.keys(this.fieldMappings.visits);
    this.setupWorksheetHeaders(worksheet, headers);
    
    // Set column widths
    this.setColumnWidths(worksheet, headers);
    
    // Add data rows
    this.populateVisitsData(worksheet, visitsData);
    
    // Add auto filter
    this.addAutoFilter(worksheet, headers.length, visitsData.length);
    
    return worksheet;
  }

  /**
   * Create partners worksheet with headers and data
   */
  createPartnersWorksheet(workbook: ExcelJS.Workbook, partnersData: PartnerData[]): ExcelJS.Worksheet {
    const worksheet = workbook.addWorksheet('Συνεργάτες');
    
    // Set up headers
    const headers = Object.keys(this.fieldMappings.partners);
    this.setupWorksheetHeaders(worksheet, headers);
    
    // Set column widths
    this.setColumnWidths(worksheet, headers);
    
    // Add data rows
    this.populatePartnersData(worksheet, partnersData);
    
    return worksheet;
  }

  /**
   * Create monthly summary worksheet
   */
  createMonthlySummaryWorksheet(
    workbook: ExcelJS.Workbook, 
    summaryData: MonthlySummaryData, 
    year: number, 
    month: number
  ): ExcelJS.Worksheet {
    const worksheet = workbook.addWorksheet('Μηνιαία Σύνοψη');

    // Add title
    this.addWorksheetTitle(worksheet, `Μηνιαία Αναφορά ΣΕΠΕ - ${this.getGreekMonthName(month)} ${year}`, 'A1:F1');

    let currentRow = 3;

    // Add summary statistics section
    currentRow = this.addSummaryStatsSection(worksheet, summaryData, currentRow);

    // Add service type breakdown section
    this.addServiceTypeBreakdownSection(worksheet, summaryData.serviceTypeBreakdown, currentRow);

    return worksheet;
  }

  /**
   * Create compliance worksheet
   */
  createComplianceWorksheet(workbook: ExcelJS.Workbook, complianceData: ComplianceData): ExcelJS.Worksheet {
    const worksheet = workbook.addWorksheet('Συμμόρφωση');

    // Add title
    this.addWorksheetTitle(worksheet, 'Αναφορά Συμμόρφωσης ΣΕΠΕ', 'A1:H1');

    let currentRow = 3;

    // Add overall compliance summary
    currentRow = this.addComplianceSummarySection(worksheet, complianceData, currentRow);

    // Add detailed compliance table
    this.addComplianceDetailSection(worksheet, complianceData, currentRow);

    return worksheet;
  }

  /**
   * Set up worksheet headers
   */
  private setupWorksheetHeaders(worksheet: ExcelJS.Worksheet, headers: string[]): void {
    worksheet.getRow(1).values = headers;
  }

  /**
   * Set column widths based on header content
   */
  private setColumnWidths(worksheet: ExcelJS.Worksheet, headers: string[]): void {
    headers.forEach((header, index) => {
      worksheet.getColumn(index + 1).width = this.getColumnWidth(header);
    });
  }

  /**
   * Populate visits data into worksheet
   */
  private populateVisitsData(worksheet: ExcelJS.Worksheet, visitsData: VisitData[]): void {
    let rowIndex = 2;
    
    for (const visit of visitsData) {
      const rowData: any[] = [];
      
      for (const [greekHeader, fieldName] of Object.entries(this.fieldMappings.visits)) {
        let value = (visit as any)[fieldName];
        value = this.formatFieldValue(fieldName, value);
        rowData.push(value);
      }
      
      worksheet.getRow(rowIndex).values = rowData;
      rowIndex++;
    }
  }

  /**
   * Populate partners data into worksheet
   */
  private populatePartnersData(worksheet: ExcelJS.Worksheet, partnersData: PartnerData[]): void {
    let rowIndex = 2;
    
    for (const partner of partnersData) {
      const rowData: any[] = [];
      
      for (const [greekHeader, fieldName] of Object.entries(this.fieldMappings.partners)) {
        let value = (partner as any)[fieldName];
        value = this.formatFieldValue(fieldName, value);
        rowData.push(value);
      }
      
      worksheet.getRow(rowIndex).values = rowData;
      rowIndex++;
    }
  }

  /**
   * Add worksheet title
   */
  private addWorksheetTitle(worksheet: ExcelJS.Worksheet, title: string, cellRange: string): void {
    worksheet.mergeCells(cellRange);
    const titleCell = worksheet.getCell(cellRange.split(':')[0]);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };
  }

  /**
   * Add summary statistics section
   */
  private addSummaryStatsSection(worksheet: ExcelJS.Worksheet, summaryData: MonthlySummaryData, startRow: number): number {
    worksheet.getCell(`A${startRow}`).value = 'ΣΤΑΤΙΣΤΙΚΑ ΣΤΟΙΧΕΙΑ';
    worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
    startRow += 2;

    const summaryStats = [
      ['Συνολικές Επισκέψεις:', summaryData.totalVisits],
      ['Ενεργοί Συνεργάτες:', summaryData.activePartners],
      ['Εγκαταστάσεις με Επισκέψεις:', summaryData.visitedInstallations],
      ['Συνολικές Ώρες Υπηρεσιών:', summaryData.totalServiceHours],
      ['Ποσοστό Συμμόρφωσης:', `${summaryData.complianceRate}%`],
      ['Μέσος Όρος Ωρών ανά Επίσκεψη:', summaryData.averageHoursPerVisit]
    ];

    summaryStats.forEach(([label, value]) => {
      worksheet.getCell(`A${startRow}`).value = label;
      worksheet.getCell(`B${startRow}`).value = value;
      worksheet.getCell(`A${startRow}`).font = { bold: true };
      startRow++;
    });

    return startRow + 2;
  }

  /**
   * Add service type breakdown section
   */
  private addServiceTypeBreakdownSection(worksheet: ExcelJS.Worksheet, serviceBreakdown: ServiceTypeBreakdown[], startRow: number): void {
    worksheet.getCell(`A${startRow}`).value = 'ΑΝΑΛΥΣΗ ΑΝΑ ΤΥΠΟ ΥΠΗΡΕΣΙΑΣ';
    worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
    startRow += 2;

    const serviceHeaders = ['Τύπος Υπηρεσίας', 'Επισκέψεις', 'Ώρες', 'Μέσος Όρος'];
    serviceHeaders.forEach((header, index) => {
      worksheet.getCell(String.fromCharCode(65 + index) + startRow).value = header;
      worksheet.getCell(String.fromCharCode(65 + index) + startRow).font = { bold: true };
    });
    startRow++;

    serviceBreakdown.forEach(service => {
      worksheet.getCell(`A${startRow}`).value = service.type;
      worksheet.getCell(`B${startRow}`).value = service.visits;
      worksheet.getCell(`C${startRow}`).value = service.hours;
      worksheet.getCell(`D${startRow}`).value = service.average;
      startRow++;
    });
  }

  /**
   * Add compliance summary section
   */
  private addComplianceSummarySection(worksheet: ExcelJS.Worksheet, complianceData: ComplianceData, startRow: number): number {
    worksheet.getCell(`A${startRow}`).value = 'ΣΥΝΟΛΙΚΗ ΣΥΜΜΟΡΦΩΣΗ';
    worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
    startRow += 2;

    const complianceStats = [
      ['Συνολικές Εγκαταστάσεις:', complianceData.totalInstallations],
      ['Σύμμορφες Εγκαταστάσεις:', complianceData.compliantInstallations],
      ['Μη Σύμμορφες Εγκαταστάσεις:', complianceData.nonCompliantInstallations],
      ['Ποσοστό Συμμόρφωσης:', `${complianceData.overallComplianceRate}%`]
    ];

    complianceStats.forEach(([label, value]) => {
      worksheet.getCell(`A${startRow}`).value = label;
      worksheet.getCell(`B${startRow}`).value = value;
      worksheet.getCell(`A${startRow}`).font = { bold: true };
      startRow++;
    });

    return startRow + 2;
  }

  /**
   * Add compliance detail section
   */
  private addComplianceDetailSection(worksheet: ExcelJS.Worksheet, complianceData: ComplianceData, startRow: number): void {
    worksheet.getCell(`A${startRow}`).value = 'ΛΕΠΤΟΜΕΡΗ ΣΤΟΙΧΕΙΑ ΣΥΜΜΟΡΦΩΣΗΣ';
    worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
    startRow += 2;

    const complianceHeaders = [
      'Κωδικός Εγκατάστασης', 'Επωνυμία', 'Κατηγορία', 'Απαιτούμενες Ώρες',
      'Πραγματοποιηθείσες Ώρες', 'Συμμόρφωση', 'Παρατηρήσεις'
    ];

    complianceHeaders.forEach((header, index) => {
      worksheet.getCell(String.fromCharCode(65 + index) + startRow).value = header;
      worksheet.getCell(String.fromCharCode(65 + index) + startRow).font = { bold: true };
    });
    startRow++;

    // Add compliance data
    complianceData.installations.forEach(installation => {
      worksheet.getCell(`A${startRow}`).value = installation.installation_code;
      worksheet.getCell(`B${startRow}`).value = installation.company_name;
      worksheet.getCell(`C${startRow}`).value = installation.category;
      worksheet.getCell(`D${startRow}`).value = installation.required_hours;
      worksheet.getCell(`E${startRow}`).value = installation.actual_hours;
      worksheet.getCell(`F${startRow}`).value = installation.compliant ? 'ΝΑΙ' : 'ΟΧΙ';
      worksheet.getCell(`G${startRow}`).value = installation.notes || '';
      startRow++;
    });
  }

  /**
   * Add visits summary section
   */
  addVisitsSummarySection(worksheet: ExcelJS.Worksheet, visitsData: VisitData[], startRow: number): void {
    const totalVisits = visitsData.length;
    const totalHours = visitsData.reduce((sum, visit) => sum + (parseFloat(visit.duration_hours.toString()) || 0), 0);
    
    worksheet.getCell(`A${startRow}`).value = 'ΣΥΝΟΨΗ:';
    worksheet.getCell(`A${startRow}`).font = { bold: true };
    worksheet.getCell(`A${startRow + 1}`).value = `Συνολικές Επισκέψεις: ${totalVisits}`;
    worksheet.getCell(`A${startRow + 2}`).value = `Συνολικές Ώρες: ${totalHours.toFixed(2)}`;
  }

  /**
   * Add partners summary section
   */
  addPartnersSummarySection(worksheet: ExcelJS.Worksheet, partnersData: PartnerData[], startRow: number): void {
    const activePartners = partnersData.filter(p => p.status === 'ΕΝΕΡΓΟΣ').length;
    
    worksheet.getCell(`A${startRow}`).value = 'ΣΥΝΟΨΗ:';
    worksheet.getCell(`A${startRow}`).font = { bold: true };
    worksheet.getCell(`A${startRow + 1}`).value = `Συνολικοί Συνεργάτες: ${partnersData.length}`;
    worksheet.getCell(`A${startRow + 2}`).value = `Ενεργοί Συνεργάτες: ${activePartners}`;
  }

  /**
   * Add auto filter to worksheet
   */
  private addAutoFilter(worksheet: ExcelJS.Worksheet, headerCount: number, dataCount: number): void {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: dataCount + 1, column: headerCount }
    };
  }

  /**
   * Format field values for Excel display
   */
  private formatFieldValue(fieldName: string, value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (fieldName) {
      case 'visit_date':
      case 'license_issued_date':
      case 'license_expiry_date':
      case 'activation_date':
        return value ? new Date(value).toLocaleDateString('el-GR') : '';
      
      case 'start_time':
      case 'end_time':
        return value ? value.substring(0, 5) : '';
      
      case 'duration_hours':
        return value ? parseFloat(value).toFixed(2) : '';
      
      case 'employees_count':
        return value ? parseInt(value).toString() : '0';
      
      default:
        return value.toString();
    }
  }

  /**
   * Get appropriate column width for header
   */
  private getColumnWidth(header: string): number {
    const widths: Record<string, number> = {
      'Κωδικός Εγκατάστασης': 20,
      'Επωνυμία Επιχείρησης': 30,
      'ΑΦΜ': 15,
      'Διεύθυνση': 35,
      'Ημερομηνία Επίσκεψης': 18,
      'Όνομα Συνεργάτη': 25,
      'Παρατηρήσεις': 40,
      'Email': 30
    };
    return widths[header] || 15;
  }

  /**
   * Get Greek month name
   */
  private getGreekMonthName(month: number): string {
    const months = [
      'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
      'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
      'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
    ];
    return months[month - 1] || 'Άγνωστος';
  }
}