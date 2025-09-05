import * as ExcelJS from 'exceljs';
import { VisitData, PartnerData } from './SEPEExcelGenerator';

/**
 * SEPE Excel Formatter
 * Handles styling, formatting, and conditional formatting for SEPE Excel exports
 */
export class SEPEExcelFormatter {

  /**
   * Apply header formatting to worksheet
   */
  formatHeaders(worksheet: ExcelJS.Worksheet): void {
    const headerRow = worksheet.getRow(1);
    
    // Header styling
    headerRow.font = { 
      bold: true, 
      color: { argb: 'FFFFFF' },
      size: 12
    };
    
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };
    
    // Header alignment
    headerRow.alignment = { 
      horizontal: 'center',
      vertical: 'middle'
    };
    
    // Header borders
    headerRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'medium', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'medium', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };
    });
    
    // Set header row height
    headerRow.height = 25;
  }

  /**
   * Apply general data formatting to worksheet
   */
  formatDataRows(worksheet: ExcelJS.Worksheet, startRow: number = 2, endRow?: number): void {
    const lastRow = endRow || worksheet.rowCount;
    
    for (let rowNumber = startRow; rowNumber <= lastRow; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Alternate row coloring for better readability
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' }
        };
      }
      
      // Apply borders and alignment to all cells
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'CCCCCC' } },
          left: { style: 'thin', color: { argb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
          right: { style: 'thin', color: { argb: 'CCCCCC' } }
        };
        
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
          wrapText: true
        };
      });
      
      // Set row height
      row.height = 20;
    }
  }

  /**
   * Apply conditional formatting to visits worksheet
   */
  applyVisitsConditionalFormatting(worksheet: ExcelJS.Worksheet, visitsData: VisitData[]): void {
    visitsData.forEach((visit, index) => {
      const rowNumber = index + 2; // Starting from row 2 (after headers)
      this.applyVisitRowFormatting(worksheet.getRow(rowNumber), visit);
    });
  }

  /**
   * Apply conditional formatting to partners worksheet
   */
  applyPartnersConditionalFormatting(worksheet: ExcelJS.Worksheet, partnersData: PartnerData[]): void {
    partnersData.forEach((partner, index) => {
      const rowNumber = index + 2; // Starting from row 2 (after headers)
      this.applyPartnerRowFormatting(worksheet.getRow(rowNumber), partner);
    });
  }

  /**
   * Apply formatting to compliance worksheet
   */
  formatComplianceWorksheet(worksheet: ExcelJS.Worksheet): void {
    // Find the row where detailed compliance data starts
    let detailStartRow = 1;
    worksheet.eachRow((row, rowNumber) => {
      if (row.getCell(1).value === 'ΛΕΠΤΟΜΕΡΗ ΣΤΟΙΧΕΙΑ ΣΥΜΜΟΡΦΩΣΗΣ') {
        detailStartRow = rowNumber + 2; // Headers are 2 rows after the title
      }
    });

    // Apply conditional formatting for non-compliant installations
    for (let rowNumber = detailStartRow + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
      const complianceCell = worksheet.getCell(`F${rowNumber}`);
      
      if (complianceCell.value === 'ΟΧΙ') {
        const row = worksheet.getRow(rowNumber);
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCCC' } // Light red for non-compliant
        };
        
        // Make the non-compliance text bold and red
        complianceCell.font = {
          bold: true,
          color: { argb: 'CC0000' }
        };
      } else if (complianceCell.value === 'ΝΑΙ') {
        complianceCell.font = {
          bold: true,
          color: { argb: '00CC00' }
        };
      }
    }

    // Apply general formatting to the detailed data section
    this.formatDataRows(worksheet, detailStartRow + 1);
    
    // Format the header of the detailed section
    if (detailStartRow > 1) {
      const headerRow = worksheet.getRow(detailStartRow);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E6F2FF' }
      };
    }
  }

  /**
   * Format summary worksheet with professional styling
   */
  formatSummaryWorksheet(worksheet: ExcelJS.Worksheet): void {
    // Apply borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'CCCCCC' } },
          left: { style: 'thin', color: { argb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
          right: { style: 'thin', color: { argb: 'CCCCCC' } }
        };
      });
    });

    // Format section headers
    worksheet.eachRow((row, rowNumber) => {
      const firstCell = row.getCell(1);
      const cellValue = firstCell.value?.toString() || '';
      
      if (cellValue.includes('ΣΤΑΤΙΣΤΙΚΑ') || 
          cellValue.includes('ΑΝΑΛΥΣΗ') || 
          cellValue.includes('ΣΥΝΟΨΗ')) {
        firstCell.font = { 
          bold: true, 
          size: 14, 
          color: { argb: '366092' } 
        };
        firstCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F0F4FF' }
        };
      }
    });

    // Format statistics rows
    this.formatStatisticsSection(worksheet);
    
    // Format service breakdown table
    this.formatServiceBreakdownTable(worksheet);
  }

  /**
   * Apply data validation to worksheet
   */
  applyDataValidation(worksheet: ExcelJS.Worksheet, type: 'visits' | 'partners'): void {
    if (type === 'visits') {
      this.applyVisitsDataValidation(worksheet);
    } else if (type === 'partners') {
      this.applyPartnersDataValidation(worksheet);
    }
  }

  /**
   * Apply conditional formatting to individual visit row
   */
  private applyVisitRowFormatting(row: ExcelJS.Row, visit: VisitData): void {
    // Highlight late or problematic visits
    const visitDate = new Date(visit.visit_date);
    const today = new Date();
    
    // Highlight visits with missing or incomplete data
    if (!visit.duration_hours || visit.duration_hours < 0.5) {
      row.getCell(12).fill = { // Duration hours column
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCC' } // Light yellow for warning
      };
    }
    
    // Highlight cancelled visits
    if (visit.status.toLowerCase().includes('ακυρωμένη')) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6' } // Light red for cancelled
      };
    }
    
    // Highlight visits with long duration (potential data entry errors)
    if (visit.duration_hours > 12) {
      row.getCell(12).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCC' } // Red for potential errors
      };
      row.getCell(12).font = {
        bold: true,
        color: { argb: 'CC0000' }
      };
    }
    
    // Format time cells
    const startTimeCell = row.getCell(10);
    const endTimeCell = row.getCell(11);
    
    startTimeCell.numFmt = 'hh:mm';
    endTimeCell.numFmt = 'hh:mm';
    
    // Format date cell
    const dateCell = row.getCell(9);
    dateCell.numFmt = 'dd/mm/yyyy';
  }

  /**
   * Apply conditional formatting to individual partner row
   */
  private applyPartnerRowFormatting(row: ExcelJS.Row, partner: PartnerData): void {
    // Highlight partners with expiring licenses
    if (partner.license_expiry_date) {
      const expiryDate = new Date(partner.license_expiry_date);
      const warningDate = new Date();
      const expiredDate = new Date();
      
      warningDate.setMonth(warningDate.getMonth() + 3); // 3 months warning
      
      const licenseExpiryCell = row.getCell(8); // License expiry date column
      
      if (expiryDate < expiredDate) {
        // Expired license - red background
        licenseExpiryCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCCC' }
        };
        licenseExpiryCell.font = {
          bold: true,
          color: { argb: 'CC0000' }
        };
      } else if (expiryDate < warningDate) {
        // Expiring soon - yellow background
        licenseExpiryCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCC' }
        };
        licenseExpiryCell.font = {
          bold: true,
          color: { argb: 'CC6600' }
        };
      }
    }
    
    // Highlight inactive partners
    if (partner.status !== 'ΕΝΕΡΓΟΣ') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' } // Light gray for inactive
      };
      
      const statusCell = row.getCell(12); // Status column
      statusCell.font = {
        bold: true,
        color: { argb: '666666' }
      };
    }
    
    // Format date cells
    const issueDateCell = row.getCell(7);
    const expiryDateCell = row.getCell(8);
    const activationDateCell = row.getCell(13);
    
    issueDateCell.numFmt = 'dd/mm/yyyy';
    expiryDateCell.numFmt = 'dd/mm/yyyy';
    activationDateCell.numFmt = 'dd/mm/yyyy';
  }

  /**
   * Apply data validation rules for visits worksheet
   */
  private applyVisitsDataValidation(worksheet: ExcelJS.Worksheet): void {
    const lastRow = worksheet.rowCount;
    
    // Validate duration hours (must be positive and reasonable)
    const durationColumn = 12; // Duration hours column
    for (let row = 2; row <= lastRow; row++) {
      worksheet.getCell(row, durationColumn).dataValidation = {
        type: 'decimal',
        operator: 'between',
        formulae: [0.25, 24],
        error: 'Οι ώρες διάρκειας πρέπει να είναι μεταξύ 0.25 και 24',
        errorTitle: 'Λάθος Διάρκεια'
      };
    }
    
    // Validate employee count
    const employeesColumn = 7; // Employees count column
    for (let row = 2; row <= lastRow; row++) {
      worksheet.getCell(row, employeesColumn).dataValidation = {
        type: 'whole',
        operator: 'greaterThan',
        formulae: [0],
        error: 'Ο αριθμός εργαζομένων πρέπει να είναι θετικός ακέραιος',
        errorTitle: 'Λάθος Αριθμός Εργαζομένων'
      };
    }
  }

  /**
   * Apply data validation rules for partners worksheet
   */
  private applyPartnersDataValidation(worksheet: ExcelJS.Worksheet): void {
    const lastRow = worksheet.rowCount;
    
    // Validate email format
    const emailColumn = 11; // Email column
    for (let row = 2; row <= lastRow; row++) {
      worksheet.getCell(row, emailColumn).dataValidation = {
        type: 'textLength',
        operator: 'greaterThan',
        formulae: [0],
        error: 'Μη έγκυρη διεύθυνση email',
        errorTitle: 'Λάθος Email'
      };
    }
    
    // Validate phone format (Greek phone numbers)
    const phoneColumn = 10; // Phone column
    for (let row = 2; row <= lastRow; row++) {
      worksheet.getCell(row, phoneColumn).dataValidation = {
        type: 'textLength',
        operator: 'between',
        formulae: [10, 14],
        error: 'Το τηλέφωνο πρέπει να έχει 10-14 ψηφία',
        errorTitle: 'Λάθος Τηλέφωνο'
      };
    }
  }

  /**
   * Format statistics section in summary worksheet
   */
  private formatStatisticsSection(worksheet: ExcelJS.Worksheet): void {
    worksheet.eachRow((row, rowNumber) => {
      const firstCell = row.getCell(1);
      const secondCell = row.getCell(2);
      
      if (firstCell.value?.toString().includes(':')) {
        // This is a statistics row
        firstCell.font = { bold: true, size: 11 };
        secondCell.font = { bold: true, size: 11, color: { argb: '366092' } };
        
        // Add background to statistics rows
        firstCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' }
        };
        secondCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' }
        };
      }
    });
  }

  /**
   * Format service breakdown table in summary worksheet
   */
  private formatServiceBreakdownTable(worksheet: ExcelJS.Worksheet): void {
    let serviceTableStart = 0;
    
    // Find the service breakdown table
    worksheet.eachRow((row, rowNumber) => {
      if (row.getCell(1).value?.toString() === 'Τύπος Υπηρεσίας') {
        serviceTableStart = rowNumber;
      }
    });
    
    if (serviceTableStart > 0) {
      // Format service breakdown headers
      const headerRow = worksheet.getRow(serviceTableStart);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E6F2FF' }
      };
      
      // Format service breakdown data rows
      for (let row = serviceTableStart + 1; row <= worksheet.rowCount; row++) {
        const dataRow = worksheet.getRow(row);
        if (dataRow.getCell(1).value) {
          // Alternate row coloring for service breakdown
          if ((row - serviceTableStart) % 2 === 0) {
            dataRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F8F9FA' }
            };
          }
          
          // Format numeric cells
          dataRow.getCell(2).numFmt = '#,##0'; // Visits
          dataRow.getCell(3).numFmt = '#,##0.00'; // Hours
          dataRow.getCell(4).numFmt = '#,##0.00'; // Average
        }
      }
    }
  }

  /**
   * Apply print settings and page setup
   */
  applyPrintSettings(worksheet: ExcelJS.Worksheet): void {
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      }
    };
    
    // Set print area and repeat headers
    worksheet.pageSetup.printArea = `A1:${this.getLastColumnLetter(worksheet)}${worksheet.rowCount}`;
    worksheet.pageSetup.printTitlesRow = '1:1'; // Repeat first row on every page
  }

  /**
   * Get the last column letter for a worksheet
   */
  private getLastColumnLetter(worksheet: ExcelJS.Worksheet): string {
    let maxColumn = 1;
    
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (colNumber > maxColumn) {
          maxColumn = colNumber;
        }
      });
    });
    
    return String.fromCharCode(64 + maxColumn);
  }
}