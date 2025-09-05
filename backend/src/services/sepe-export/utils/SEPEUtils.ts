import * as path from 'path';
import { promises as fs } from 'fs';
import { SEPEFilters } from '../types';

export class SEPEUtils {

    static generateFilename(type: string, filters: SEPEFilters): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const dateRange = filters.startDate && filters.endDate 
            ? `_${filters.startDate}_${filters.endDate}`.replace(/-/g, '')
            : '';
        
        return `SEPE_${type}_${timestamp}${dateRange}.xlsx`;
    }

    static async ensureExportDirectory(baseDir: string): Promise<string> {
        const exportDir = path.join(baseDir, 'exports', 'sepe');
        
        try {
            await fs.access(exportDir);
        } catch {
            await fs.mkdir(exportDir, { recursive: true });
        }
        
        return exportDir;
    }

    static formatGreekDate(dateString: string): string {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('el-GR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    static formatGreekDateTime(dateString: string): string {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('el-GR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    }

    static getGreekMonthName(month: number): string {
        const months = [
            '', 'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 
            'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος',
            'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
        ];
        return months[month] || `Μήνας ${month}`;
    }

    static translateServiceType(serviceType: string): string {
        const translations: Record<string, string> = {
            'occupational_doctor': 'Ιατρός Εργασίας',
            'safety_engineer': 'Μηχανικός Ασφαλείας',
            'specialist_consultation': 'Ειδική Συμβουλευτική',
            'health_safety_officer': 'Τεχνικός Ασφαλείας',
            'industrial_hygienist': 'Βιομηχανικός Υγιεινολόγος',
            'environmental_engineer': 'Περιβαλλοντικός Μηχανικός'
        };
        return translations[serviceType] || serviceType;
    }

    static translateStatus(status: string): string {
        const translations: Record<string, string> = {
            'scheduled': 'Προγραμματισμένη',
            'confirmed': 'Επιβεβαιωμένη', 
            'in_progress': 'Σε εξέλιξη',
            'completed': 'Ολοκληρωμένη',
            'cancelled': 'Ακυρωμένη',
            'postponed': 'Αναβλήθηκε',
            'no_show': 'Δεν εμφανίστηκε'
        };
        return translations[status] || status;
    }

    static translatePartnerStatus(isActive: boolean): string {
        return isActive ? 'ΕΝΕΡΓΟΣ' : 'ΑΝΕΝΕΡΓΟΣ';
    }

    static translateRiskCategory(category: string): string {
        const translations: Record<string, string> = {
            'A': 'Υψηλός Κίνδυνος',
            'B': 'Μέσος Κίνδυνος', 
            'C': 'Χαμηλός Κίνδυνος',
            'HIGH': 'Υψηλός',
            'MEDIUM': 'Μέσος',
            'LOW': 'Χαμηλός'
        };
        return translations[category] || category;
    }

    static calculateDuration(startTime: string, endTime: string): number {
        if (!startTime || !endTime) return 0;
        
        try {
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            
            const diffMs = end.getTime() - start.getTime();
            const hours = Math.max(0, diffMs / (1000 * 60 * 60));
            
            return Math.round(hours * 100) / 100; // Round to 2 decimal places
        } catch {
            return 0;
        }
    }

    static validateFilters(filters: SEPEFilters): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!filters.startDate || !filters.endDate) {
            errors.push('Απαιτούνται ημερομηνίες έναρξης και λήξης');
        }

        if (filters.startDate && filters.endDate) {
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            
            if (startDate > endDate) {
                errors.push('Η ημερομηνία έναρξης πρέπει να είναι πριν την ημερομηνία λήξης');
            }

            const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 366) {
                errors.push('Το εύρος ημερομηνιών δεν μπορεί να υπερβαίνει το ένα έτος');
            }
        }

        if (filters.partnerIds && filters.partnerIds.length > 100) {
            errors.push('Δεν μπορείτε να επιλέξετε περισσότερους από 100 συνεργάτες');
        }

        if (filters.installationCodes && filters.installationCodes.length > 1000) {
            errors.push('Δεν μπορείτε να επιλέξετε περισσότερες από 1000 εγκαταστάσεις');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static sanitizeFilename(filename: string): string {
        return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    }

    static formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = bytes / Math.pow(1024, i);
        
        return `${Math.round(size * 100) / 100} ${sizes[i]}`;
    }

    static createDownloadUrl(filepath: string, baseUrl: string): string {
        const filename = path.basename(filepath);
        return `${baseUrl}/api/downloads/sepe/${encodeURIComponent(filename)}`;
    }

    static async getFileStats(filepath: string): Promise<{ size: number; exists: boolean }> {
        try {
            const stats = await fs.stat(filepath);
            return {
                size: stats.size,
                exists: true
            };
        } catch {
            return {
                size: 0,
                exists: false
            };
        }
    }

    static generateExportSummary(recordCount: number, filters: SEPEFilters, startTime: Date): {
        recordCount: number;
        dateRange: { start: string; end: string };
        exportDuration: number;
        filtersApplied: string[];
    } {
        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

        const filtersApplied: string[] = [];
        if (filters.partnerIds?.length) {
            filtersApplied.push(`${filters.partnerIds.length} συνεργάτες`);
        }
        if (filters.installationCodes?.length) {
            filtersApplied.push(`${filters.installationCodes.length} εγκαταστάσεις`);
        }
        if (filters.serviceTypes?.length) {
            filtersApplied.push(`${filters.serviceTypes.length} είδη υπηρεσιών`);
        }
        if (filters.specialties?.length) {
            filtersApplied.push(`${filters.specialties.length} ειδικότητες`);
        }
        if (filters.activeOnly) {
            filtersApplied.push('μόνο ενεργοί');
        }

        return {
            recordCount,
            dateRange: {
                start: filters.startDate || '',
                end: filters.endDate || ''
            },
            exportDuration: duration,
            filtersApplied
        };
    }
}