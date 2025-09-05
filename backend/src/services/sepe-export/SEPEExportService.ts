import * as path from 'path';
import { promises as fs } from 'fs';
import { Logger } from '../types';
import SEPEDataAccess from './data/SEPEDataAccess';
import { SEPEExcelGenerator } from './excel/SEPEExcelGenerator';
import { SEPEExcelFormatter } from './excel/SEPEExcelFormatter';
import { SEPEUtils } from './utils/SEPEUtils';
import { 
    SEPEFilters, 
    ExportResult, 
    ExportSummary,
    VisitData,
    PartnerData,
    MonthlySummaryData,
    ComplianceData
} from './types';

const logger: Logger = require('../utils/logger');

export class SEPEExportService {
    private dataAccess: SEPEDataAccess;
    private excelGenerator: SEPEExcelGenerator;
    private excelFormatter: SEPEExcelFormatter;
    private baseDir: string;

    constructor(baseDir: string = process.cwd()) {
        this.dataAccess = new SEPEDataAccess();
        this.excelGenerator = new SEPEExcelGenerator();
        this.excelFormatter = new SEPEExcelFormatter();
        this.baseDir = baseDir;
    }

    async exportVisitsData(filters: SEPEFilters): Promise<ExportResult> {
        const startTime = new Date();
        
        try {
            logger.info('Starting SEPE visits export', { filters });

            const validation = SEPEUtils.validateFilters(filters);
            if (!validation.valid) {
                throw new Error(`Invalid filters: ${validation.errors.join(', ')}`);
            }

            const data = await this.dataAccess.getVisitsData(filters);
            
            if (data.length === 0) {
                logger.warn('No visit data found for export criteria');
                return this.createEmptyResult('visits', filters);
            }

            const workbook = this.excelGenerator.createWorkbook();
            const worksheet = this.excelGenerator.createVisitsWorksheet(workbook, data);

            this.excelFormatter.formatHeaders(worksheet);
            this.excelFormatter.formatDataRows(worksheet);
            this.excelFormatter.applyVisitsConditionalFormatting(worksheet, data);
            this.excelFormatter.applyPrintSettings(worksheet);

            const exportResult = await this.saveWorkbook(workbook, 'visits', filters);
            const summary = SEPEUtils.generateExportSummary(data.length, filters, startTime);

            await this.dataAccess.logExport('visits', exportResult.filename, summary, filters);

            logger.info('SEPE visits export completed successfully', {
                filename: exportResult.filename,
                recordCount: data.length,
                duration: summary.exportDuration
            });

            return {
                ...exportResult,
                summary: summary as any
            };

        } catch (error) {
            logger.error('Failed to export visits data', {
                error: error instanceof Error ? error.message : String(error),
                filters
            });
            throw error;
        }
    }

    async exportPartnersData(filters: SEPEFilters): Promise<ExportResult> {
        const startTime = new Date();

        try {
            logger.info('Starting SEPE partners export', { filters });

            const data = await this.dataAccess.getPartnersData(filters);

            if (data.length === 0) {
                logger.warn('No partner data found for export criteria');
                return this.createEmptyResult('partners', filters);
            }

            const workbook = this.excelGenerator.createWorkbook();
            const worksheet = this.excelGenerator.createPartnersWorksheet(workbook, data);

            this.excelFormatter.formatHeaders(worksheet);
            this.excelFormatter.formatDataRows(worksheet);
            this.excelFormatter.applyPartnersConditionalFormatting(worksheet, data);
            this.excelFormatter.applyPrintSettings(worksheet);

            const exportResult = await this.saveWorkbook(workbook, 'partners', filters);
            const summary = SEPEUtils.generateExportSummary(data.length, filters, startTime);

            await this.dataAccess.logExport('partners', exportResult.filename, summary, filters);

            logger.info('SEPE partners export completed successfully', {
                filename: exportResult.filename,
                recordCount: data.length,
                duration: summary.exportDuration
            });

            return {
                ...exportResult,
                summary: summary as any
            };

        } catch (error) {
            logger.error('Failed to export partners data', {
                error: error instanceof Error ? error.message : String(error),
                filters
            });
            throw error;
        }
    }

    async exportMonthlySummary(year: number, month: number): Promise<ExportResult> {
        const startTime = new Date();

        try {
            logger.info('Starting SEPE monthly summary export', { year, month });

            const data = await this.dataAccess.getMonthlySummaryData(year, month);
            
            const workbook = this.excelGenerator.createWorkbook();
            const worksheet = this.excelGenerator.createMonthlySummaryWorksheet(workbook, data, year, month);

            this.excelFormatter.formatSummaryWorksheet(worksheet);
            this.excelFormatter.applyPrintSettings(worksheet);

            const filters: SEPEFilters = {
                startDate: `${year}-${month.toString().padStart(2, '0')}-01`,
                endDate: new Date(year, month, 0).toISOString().split('T')[0]
            };

            const exportResult = await this.saveWorkbook(workbook, `monthly_summary_${year}_${month}`, filters);
            const summary = SEPEUtils.generateExportSummary(data.totalVisits, filters, startTime);

            await this.dataAccess.logExport('monthly_summary', exportResult.filename, summary, filters);

            logger.info('SEPE monthly summary export completed successfully', {
                filename: exportResult.filename,
                recordCount: data.totalVisits,
                duration: summary.exportDuration
            });

            return {
                ...exportResult,
                summary: summary as any
            };

        } catch (error) {
            logger.error('Failed to export monthly summary', {
                error: error instanceof Error ? error.message : String(error),
                year,
                month
            });
            throw error;
        }
    }

    async exportComplianceData(filters: SEPEFilters): Promise<ExportResult> {
        const startTime = new Date();

        try {
            logger.info('Starting SEPE compliance export', { filters });

            const data = await this.dataAccess.getComplianceData(filters);

            const workbook = this.excelGenerator.createWorkbook();
            const worksheet = this.excelGenerator.createComplianceWorksheet(workbook, data);

            this.excelFormatter.formatComplianceWorksheet(worksheet, data);
            this.excelFormatter.applyPrintSettings(worksheet);

            const exportResult = await this.saveWorkbook(workbook, 'compliance', filters);
            const summary = SEPEUtils.generateExportSummary(data.totalInstallations, filters, startTime);

            await this.dataAccess.logExport('compliance', exportResult.filename, summary, filters);

            logger.info('SEPE compliance export completed successfully', {
                filename: exportResult.filename,
                recordCount: data.totalInstallations,
                duration: summary.exportDuration
            });

            return {
                ...exportResult,
                complianceRate: data.overallComplianceRate,
                summary: summary as any
            };

        } catch (error) {
            logger.error('Failed to export compliance data', {
                error: error instanceof Error ? error.message : String(error),
                filters
            });
            throw error;
        }
    }

    private async saveWorkbook(workbook: any, type: string, filters: SEPEFilters): Promise<ExportResult> {
        try {
            const exportDir = await SEPEUtils.ensureExportDirectory(this.baseDir);
            const filename = SEPEUtils.generateFilename(type, filters);
            const filepath = path.join(exportDir, filename);

            await workbook.xlsx.writeFile(filepath);

            const fileStats = await SEPEUtils.getFileStats(filepath);
            const downloadUrl = SEPEUtils.createDownloadUrl(filepath, process.env.BASE_URL || 'http://localhost:3000');

            return {
                success: true,
                filename,
                filepath,
                recordCount: 0, // Will be set by calling method
                downloadUrl
            };

        } catch (error) {
            logger.error('Failed to save workbook', {
                error: error instanceof Error ? error.message : String(error),
                type
            });
            throw error;
        }
    }

    private createEmptyResult(type: string, filters: SEPEFilters): ExportResult {
        return {
            success: false,
            filename: '',
            filepath: '',
            recordCount: 0,
            downloadUrl: '',
            summary: {
                totalVisits: 0,
                totalPartners: 0,
                totalInstallations: 0,
                dateRange: {
                    start: filters.startDate || '',
                    end: filters.endDate || ''
                },
                exportDuration: 0
            } as any
        };
    }
}