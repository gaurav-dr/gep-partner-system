import * as ExcelJS from 'exceljs';
import { VisitData, PartnerData, ComplianceData } from '../types';

export class SEPEExcelFormatter {

    formatHeaders(worksheet: ExcelJS.Worksheet): void {
        const headerRow = worksheet.getRow(1);
        
        headerRow.eachCell((cell) => {
            cell.font = { 
                bold: true, 
                color: { argb: 'FFFFFF' }, 
                size: 11,
                name: 'Calibri'
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '1F497D' }
            };
            cell.alignment = { 
                horizontal: 'center', 
                vertical: 'middle', 
                wrapText: true 
            };
            cell.border = {
                top: { style: 'medium', color: { argb: '000000' } },
                left: { style: 'medium', color: { argb: '000000' } },
                bottom: { style: 'medium', color: { argb: '000000' } },
                right: { style: 'medium', color: { argb: '000000' } }
            };
        });

        headerRow.height = 30;
    }

    formatDataRows(worksheet: ExcelJS.Worksheet, startRow: number = 2): void {
        const lastRowNumber = worksheet.lastRow?.number || startRow;
        
        for (let rowNumber = startRow; rowNumber <= lastRowNumber; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            row.eachCell((cell) => {
                cell.font = { size: 10, name: 'Calibri' };
                cell.alignment = { 
                    vertical: 'middle', 
                    wrapText: true,
                    horizontal: 'left'
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'CCCCCC' } },
                    left: { style: 'thin', color: { argb: 'CCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
                    right: { style: 'thin', color: { argb: 'CCCCCC' } }
                };

                if ((rowNumber - startRow) % 2 === 1) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F8F9FA' }
                    };
                }
            });

            row.height = 20;
        }
    }

    applyVisitsConditionalFormatting(worksheet: ExcelJS.Worksheet, data: VisitData[]): void {
        const startRow = 2;
        
        data.forEach((visit, index) => {
            const rowNumber = startRow + index;
            const row = worksheet.getRow(rowNumber);

            if (visit.status === 'Ακυρωμένη') {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFCCCB' }
                    };
                    cell.font = { ...cell.font, color: { argb: '8B0000' } };
                });
            }

            if (visit.duration_hours > 8) {
                const durationCell = row.getCell(12);
                durationCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE5B4' }
                };
                durationCell.font = { ...durationCell.font, color: { argb: 'FF8C00' } };
            }

            if (!visit.notes || visit.notes.trim() === '') {
                const notesCell = row.getCell(17);
                notesCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFACD' }
                };
                notesCell.value = '⚠️ Χωρίς παρατηρήσεις';
            }
        });

        this.addConditionalFormattingLegend(worksheet, 'visits');
    }

    applyPartnersConditionalFormatting(worksheet: ExcelJS.Worksheet, data: PartnerData[]): void {
        const startRow = 2;
        const today = new Date();
        const threeMonthsFromNow = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000));

        data.forEach((partner, index) => {
            const rowNumber = startRow + index;
            const row = worksheet.getRow(rowNumber);

            if (partner.status === 'ΑΝΕΝΕΡΓΟΣ') {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'D3D3D3' }
                    };
                    cell.font = { ...cell.font, color: { argb: '696969' } };
                });
            }

            if (partner.license_expiry_date) {
                try {
                    const expiryDate = new Date(partner.license_expiry_date);
                    const expiryCell = row.getCell(8);

                    if (expiryDate < today) {
                        expiryCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF6B6B' }
                        };
                        expiryCell.font = { ...expiryCell.font, color: { argb: 'FFFFFF' } };
                    } else if (expiryDate < threeMonthsFromNow) {
                        expiryCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFD93D' }
                        };
                        expiryCell.font = { ...expiryCell.font, color: { argb: '000000' } };
                    }
                } catch {
                    // Invalid date format
                }
            }

            if (!partner.email || partner.email.trim() === '') {
                const emailCell = row.getCell(11);
                emailCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFACD' }
                };
                emailCell.value = '⚠️ Χωρίς email';
            }
        });

        this.addConditionalFormattingLegend(worksheet, 'partners');
    }

    formatComplianceWorksheet(worksheet: ExcelJS.Worksheet, data: ComplianceData): void {
        this.formatHeaders(worksheet);
        
        const startRow = 7;
        data.installations.forEach((installation, index) => {
            const rowNumber = startRow + index;
            const row = worksheet.getRow(rowNumber);

            if (!installation.compliant) {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE4E1' }
                    };
                });
                
                const complianceCell = row.getCell(6);
                complianceCell.font = { 
                    bold: true, 
                    color: { argb: 'DC143C' } 
                };
            } else {
                const complianceCell = row.getCell(6);
                complianceCell.font = { 
                    bold: true, 
                    color: { argb: '228B22' } 
                };
            }
        });

        this.formatSummarySection(worksheet, 1, 4);
        this.addComplianceLegend(worksheet);
    }

    formatSummaryWorksheet(worksheet: ExcelJS.Worksheet): void {
        const titleCell = worksheet.getCell(1, 1);
        titleCell.font = { 
            size: 18, 
            bold: true, 
            color: { argb: '1F497D' },
            name: 'Calibri'
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        for (let row = 3; row <= 8; row++) {
            const labelCell = worksheet.getCell(row, 1);
            const valueCell = worksheet.getCell(row, 2);
            
            labelCell.font = { bold: true, size: 12, name: 'Calibri' };
            labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
            
            valueCell.font = { size: 12, name: 'Calibri' };
            valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
            
            if (row === 8) { // Compliance rate
                valueCell.font = { ...valueCell.font, bold: true, color: { argb: '228B22' } };
            }
        }

        this.formatServiceTypeBreakdown(worksheet);
    }

    applyPrintSettings(worksheet: ExcelJS.Worksheet): void {
        worksheet.pageSetup = {
            ...worksheet.pageSetup,
            paperSize: 9, // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: {
                left: 0.7,
                right: 0.7,
                top: 0.75,
                bottom: 0.75,
                header: 0.3,
                footer: 0.3
            },
            printArea: undefined,
            showGridLines: false
        };

        worksheet.headerFooter.oddHeader = '&C&\"Calibri,Bold\"&14SEPE Export Report';
        worksheet.headerFooter.oddFooter = '&L&D &T&R&P of &N';
    }

    private formatSummarySection(worksheet: ExcelJS.Worksheet, startRow: number, endRow: number): void {
        for (let row = startRow; row <= endRow; row++) {
            const labelCell = worksheet.getCell(row, 1);
            const valueCell = worksheet.getCell(row, 2);
            
            labelCell.font = { bold: true, size: 12, name: 'Calibri' };
            labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
            
            valueCell.font = { size: 12, name: 'Calibri' };
            valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
    }

    private formatServiceTypeBreakdown(worksheet: ExcelJS.Worksheet): void {
        const breakdownStartRow = 11;
        const headerRow = worksheet.getRow(breakdownStartRow);
        
        headerRow.eachCell((cell) => {
            cell.font = { 
                bold: true, 
                color: { argb: 'FFFFFF' }, 
                size: 11,
                name: 'Calibri'
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '365F91' }
            };
            cell.alignment = { 
                horizontal: 'center', 
                vertical: 'middle' 
            };
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
        });
    }

    private addConditionalFormattingLegend(worksheet: ExcelJS.Worksheet, type: 'visits' | 'partners'): void {
        const lastRow = worksheet.lastRow?.number || 1;
        const legendStartRow = lastRow + 3;

        worksheet.getCell(legendStartRow, 1).value = 'ΥΠΟΜΝΗΜΑ:';
        worksheet.getCell(legendStartRow, 1).font = { bold: true, size: 12 };

        if (type === 'visits') {
            this.addLegendItem(worksheet, legendStartRow + 1, 'FFCCCB', 'Ακυρωμένες επισκέψεις');
            this.addLegendItem(worksheet, legendStartRow + 2, 'FFE5B4', 'Επισκέψεις > 8 ωρών');
            this.addLegendItem(worksheet, legendStartRow + 3, 'FFFACD', 'Χωρίς παρατηρήσεις');
        } else {
            this.addLegendItem(worksheet, legendStartRow + 1, 'D3D3D3', 'Ανενεργοί συνεργάτες');
            this.addLegendItem(worksheet, legendStartRow + 2, 'FF6B6B', 'Ληγμένες άδειες');
            this.addLegendItem(worksheet, legendStartRow + 3, 'FFD93D', 'Άδειες που λήγουν σε 3 μήνες');
            this.addLegendItem(worksheet, legendStartRow + 4, 'FFFACD', 'Χωρίς email');
        }
    }

    private addComplianceLegend(worksheet: ExcelJS.Worksheet): void {
        const lastRow = worksheet.lastRow?.number || 1;
        const legendStartRow = lastRow + 3;

        worksheet.getCell(legendStartRow, 1).value = 'ΥΠΟΜΝΗΜΑ ΣΥΜΜΟΡΦΩΣΗΣ:';
        worksheet.getCell(legendStartRow, 1).font = { bold: true, size: 12 };

        this.addLegendItem(worksheet, legendStartRow + 1, 'FFE4E1', 'Μη συμμορφούμενες εγκαταστάσεις');
        
        const greenCell = worksheet.getCell(legendStartRow + 2, 1);
        greenCell.value = '✓ Συμμορφούμενες (πράσινο κείμενο)';
        greenCell.font = { color: { argb: '228B22' } };
        
        const redCell = worksheet.getCell(legendStartRow + 3, 1);
        redCell.value = '✗ Μη συμμορφούμενες (κόκκινο κείμενο)';
        redCell.font = { color: { argb: 'DC143C' } };
    }

    private addLegendItem(worksheet: ExcelJS.Worksheet, row: number, colorCode: string, description: string): void {
        const colorCell = worksheet.getCell(row, 1);
        const descCell = worksheet.getCell(row, 2);
        
        colorCell.value = '■';
        colorCell.font = { 
            size: 16, 
            color: { argb: colorCode } 
        };
        
        descCell.value = description;
        descCell.font = { size: 10 };
    }
}