import * as ExcelJS from 'exceljs';
import { Logger } from '../../types';
import { VisitData, PartnerData, MonthlySummaryData, ComplianceData, ServiceTypeBreakdown } from '../types';

const logger: Logger = require('../../utils/logger');

export class SEPEExcelGenerator {

    createWorkbook(): ExcelJS.Workbook {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'GEP Partner System';
        workbook.lastModifiedBy = 'SEPE Export Service';
        workbook.created = new Date();
        workbook.modified = new Date();
        return workbook;
    }

    createVisitsWorksheet(workbook: ExcelJS.Workbook, data: VisitData[]): ExcelJS.Worksheet {
        const worksheet = workbook.addWorksheet('Επισκέψεις', {
            pageSetup: {
                paperSize: 9,
                orientation: 'landscape',
                fitToPage: true,
                margins: {
                    left: 0.7, right: 0.7, top: 0.75, bottom: 0.75,
                    header: 0.3, footer: 0.3
                }
            }
        });

        const headers = [
            'Κωδικός Εγκατάστασης',
            'Επωνυμία Εταιρείας',
            'Α.Φ.Μ.',
            'Διεύθυνση',
            'Πόλη',
            'Τ.Κ.',
            'Αριθμός Εργαζομένων',
            'Κατηγορία Κινδύνου',
            'Ημερομηνία Επίσκεψης',
            'Ώρα Έναρξης',
            'Ώρα Λήξης',
            'Διάρκεια (ώρες)',
            'Είδος Υπηρεσίας',
            'Όνομα Συνεργάτη',
            'Άδεια Συνεργάτη',
            'Ειδικότητα',
            'Παρατηρήσεις',
            'Κατάσταση'
        ];

        this.setupWorksheetHeaders(worksheet, headers);
        this.populateVisitsData(worksheet, data, headers.length);

        const columnWidths = [15, 25, 12, 30, 15, 8, 12, 15, 12, 10, 10, 10, 20, 20, 15, 20, 30, 15];
        columnWidths.forEach((width, index) => {
            worksheet.getColumn(index + 1).width = width;
        });

        return worksheet;
    }

    createPartnersWorksheet(workbook: ExcelJS.Workbook, data: PartnerData[]): ExcelJS.Worksheet {
        const worksheet = workbook.addWorksheet('Συνεργάτες', {
            pageSetup: {
                paperSize: 9,
                orientation: 'landscape',
                fitToPage: true
            }
        });

        const headers = [
            'Κωδικός Συνεργάτη',
            'Πλήρες Όνομα',
            'Α.Φ.Μ.',
            'Α.Μ.Κ.Α.',
            'Αριθμός Άδειας',
            'Ειδικότητα',
            'Ημ. Έκδοσης Άδειας',
            'Ημ. Λήξης Άδειας',
            'Διεύθυνση',
            'Τηλέφωνο',
            'Email',
            'Κατάσταση',
            'Ημ. Ενεργοποίησης'
        ];

        this.setupWorksheetHeaders(worksheet, headers);
        this.populatePartnersData(worksheet, data, headers.length);

        const columnWidths = [15, 25, 12, 15, 15, 20, 12, 12, 30, 15, 25, 12, 12];
        columnWidths.forEach((width, index) => {
            worksheet.getColumn(index + 1).width = width;
        });

        return worksheet;
    }

    createMonthlySummaryWorksheet(workbook: ExcelJS.Workbook, data: MonthlySummaryData, year: number, month: number): ExcelJS.Worksheet {
        const monthName = this.getGreekMonthName(month);
        const worksheet = workbook.addWorksheet(`Σύνοψη ${monthName} ${year}`);

        let currentRow = 1;

        worksheet.getCell(currentRow, 1).value = `ΜΗΝΙΑΙΑ ΣΥΝΟΨΗ - ${monthName.toUpperCase()} ${year}`;
        worksheet.getCell(currentRow, 1).font = { size: 16, bold: true, color: { argb: '1F497D' } };
        worksheet.mergeCells(currentRow, 1, currentRow, 4);
        currentRow += 2;

        const summaryData = [
            ['Συνολικές Επισκέψεις:', data.totalVisits],
            ['Συνολικές Ώρες Υπηρεσιών:', data.totalServiceHours],
            ['Ενεργοί Συνεργάτες:', data.activePartners],
            ['Επισκεφθείσες Εγκαταστάσεις:', data.visitedInstallations],
            ['Μέσος Όρος Ωρών/Επίσκεψη:', data.averageHoursPerVisit],
            ['Ποσοστό Συμμόρφωσης:', `${data.complianceRate}%`]
        ];

        summaryData.forEach(([label, value]) => {
            worksheet.getCell(currentRow, 1).value = label;
            worksheet.getCell(currentRow, 1).font = { bold: true };
            worksheet.getCell(currentRow, 2).value = value;
            currentRow++;
        });

        currentRow += 2;

        worksheet.getCell(currentRow, 1).value = 'ΑΝΑΛΥΣΗ ΑΝΑ ΕΙΔΟΣ ΥΠΗΡΕΣΙΑΣ';
        worksheet.getCell(currentRow, 1).font = { size: 14, bold: true, color: { argb: '1F497D' } };
        worksheet.mergeCells(currentRow, 1, currentRow, 4);
        currentRow += 2;

        const serviceHeaders = ['Είδος Υπηρεσίας', 'Επισκέψεις', 'Συνολικές Ώρες', 'Μ.Ό. Ώρες'];
        serviceHeaders.forEach((header, index) => {
            worksheet.getCell(currentRow, index + 1).value = header;
            worksheet.getCell(currentRow, index + 1).font = { bold: true };
        });
        currentRow++;

        data.serviceTypeBreakdown.forEach((service) => {
            worksheet.getCell(currentRow, 1).value = service.type;
            worksheet.getCell(currentRow, 2).value = service.visits;
            worksheet.getCell(currentRow, 3).value = service.hours;
            worksheet.getCell(currentRow, 4).value = service.average;
            currentRow++;
        });

        worksheet.getColumn(1).width = 25;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 15;
        worksheet.getColumn(4).width = 15;

        return worksheet;
    }

    createComplianceWorksheet(workbook: ExcelJS.Workbook, data: ComplianceData): ExcelJS.Worksheet {
        const worksheet = workbook.addWorksheet('Συμμόρφωση');

        let currentRow = 1;

        worksheet.getCell(currentRow, 1).value = 'ΑΝΑΦΟΡΑ ΣΥΜΜΟΡΦΩΣΗΣ ΕΓΚΑΤΑΣΤΑΣΕΩΝ';
        worksheet.getCell(currentRow, 1).font = { size: 16, bold: true, color: { argb: '1F497D' } };
        worksheet.mergeCells(currentRow, 1, currentRow, 7);
        currentRow += 2;

        const summaryData = [
            ['Συνολικές Εγκαταστάσεις:', data.totalInstallations],
            ['Συμμορφούμενες:', data.compliantInstallations],
            ['Μη Συμμορφούμενες:', data.nonCompliantInstallations],
            ['Ποσοστό Συμμόρφωσης:', `${data.overallComplianceRate}%`]
        ];

        summaryData.forEach(([label, value]) => {
            worksheet.getCell(currentRow, 1).value = label;
            worksheet.getCell(currentRow, 1).font = { bold: true };
            worksheet.getCell(currentRow, 2).value = value;
            currentRow++;
        });

        currentRow += 2;

        const headers = [
            'Κωδικός Εγκατάστασης',
            'Επωνυμία Εταιρείας',
            'Κατηγορία',
            'Απαιτούμενες Ώρες',
            'Πραγματικές Ώρες',
            'Συμμόρφωση',
            'Παρατηρήσεις'
        ];

        headers.forEach((header, index) => {
            worksheet.getCell(currentRow, index + 1).value = header;
            worksheet.getCell(currentRow, index + 1).font = { bold: true };
        });
        currentRow++;

        data.installations.forEach((installation) => {
            worksheet.getCell(currentRow, 1).value = installation.installation_code;
            worksheet.getCell(currentRow, 2).value = installation.company_name;
            worksheet.getCell(currentRow, 3).value = installation.category;
            worksheet.getCell(currentRow, 4).value = installation.required_hours;
            worksheet.getCell(currentRow, 5).value = installation.actual_hours;
            worksheet.getCell(currentRow, 6).value = installation.compliant ? 'ΝΑΙ' : 'ΟΧΙ';
            worksheet.getCell(currentRow, 7).value = installation.notes;
            currentRow++;
        });

        const columnWidths = [15, 25, 15, 15, 15, 12, 30];
        columnWidths.forEach((width, index) => {
            worksheet.getColumn(index + 1).width = width;
        });

        return worksheet;
    }

    private setupWorksheetHeaders(worksheet: ExcelJS.Worksheet, headers: string[]): void {
        const headerRow = worksheet.addRow(headers);
        headerRow.height = 25;
        
        headerRow.eachCell((cell, index) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '1F497D' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
        });
    }

    private populateVisitsData(worksheet: ExcelJS.Worksheet, data: VisitData[], columnCount: number): void {
        data.forEach((visit, index) => {
            const rowData = [
                visit.installation_code,
                visit.company_name,
                visit.tax_number,
                visit.address,
                visit.city,
                visit.postal_code,
                visit.employees_count,
                visit.risk_category,
                this.formatDate(visit.visit_date),
                visit.start_time,
                visit.end_time,
                visit.duration_hours,
                visit.service_type,
                visit.partner_name,
                visit.partner_license,
                visit.partner_specialty,
                visit.notes,
                visit.status
            ];

            const row = worksheet.addRow(rowData);
            row.height = 20;

            row.eachCell((cell, cellIndex) => {
                cell.alignment = { vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'CCCCCC' } },
                    left: { style: 'thin', color: { argb: 'CCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
                    right: { style: 'thin', color: { argb: 'CCCCCC' } }
                };

                if (index % 2 === 1) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F8F9FA' }
                    };
                }
            });
        });
    }

    private populatePartnersData(worksheet: ExcelJS.Worksheet, data: PartnerData[], columnCount: number): void {
        data.forEach((partner, index) => {
            const rowData = [
                partner.partner_id,
                partner.full_name,
                partner.tax_number,
                partner.social_security_number,
                partner.license_number,
                partner.specialty,
                this.formatDate(partner.license_issued_date),
                this.formatDate(partner.license_expiry_date),
                partner.address,
                partner.phone,
                partner.email,
                partner.status,
                this.formatDate(partner.activation_date)
            ];

            const row = worksheet.addRow(rowData);
            row.height = 20;

            row.eachCell((cell, cellIndex) => {
                cell.alignment = { vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'CCCCCC' } },
                    left: { style: 'thin', color: { argb: 'CCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
                    right: { style: 'thin', color: { argb: 'CCCCCC' } }
                };

                if (index % 2 === 1) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F8F9FA' }
                    };
                }
            });
        });
    }

    private formatDate(dateString: string): string {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('el-GR');
        } catch {
            return dateString;
        }
    }

    private getGreekMonthName(month: number): string {
        const months = [
            '', 'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
            'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
        ];
        return months[month] || `Μήνας ${month}`;
    }
}