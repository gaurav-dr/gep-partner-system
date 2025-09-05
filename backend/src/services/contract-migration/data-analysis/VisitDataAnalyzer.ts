import { Logger } from '../../types';
import { supabaseAdmin } from '../../config/supabase';
import { 
    VisitData, 
    VisitAnalysis, 
    PartnerInstallationPair,
    RelationshipStrength
} from '../types/migration-types';

const logger: Logger = require('../../utils/logger');

export interface VisitFrequencyData {
  partnerId: string;
  installationCode: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';
  averageInterval: number;
  totalVisits: number;
  lastVisit: string;
}

export interface TemporalPattern {
  partnerId: string;
  installationCode: string;
  seasonality: 'spring' | 'summer' | 'autumn' | 'winter' | 'none';
  monthlyDistribution: Record<string, number>;
  dayOfWeekDistribution: Record<string, number>;
  peakPeriods: Array<{
    period: string;
    intensity: number;
  }>;
}

export default class VisitDataAnalyzer {
    private confidenceThreshold: number;

    constructor(confidenceThreshold: number = 0.7) {
        this.confidenceThreshold = confidenceThreshold;
    }

    async analyzeExistingVistData(): Promise<VisitAnalysis> {
        try {
            logger.info('Analyzing existing visit data patterns');

            const { data: visits, error } = await supabaseAdmin
                .from('visits')
                .select(`
                    *,
                    partners(id, name, specialty, city),
                    installations(installation_code, company_name, address, employees_count, category)
                `)
                .order('visit_date', { ascending: false });

            if (error) {
                throw error;
            }

            const visitsData = visits as VisitData[];

            const analysis: VisitAnalysis = {
                totalVisits: visitsData.length,
                uniquePartners: new Set(visitsData.map(v => v.partner_id)).size,
                uniqueInstallations: new Set(visitsData.map(v => v.installation_code)).size,
                visitsByPartner: this.groupVisitsByPartner(visitsData),
                visitsByInstallation: this.groupVisitsByInstallation(visitsData),
                partnerInstallationPairs: this.identifyPartnerInstallationPairs(visitsData),
                visitFrequency: await this.analyzeVisitFrequency(visitsData),
                temporalPatterns: await this.analyzeTemporalPatterns(visitsData),
                summary: {
                    avgVisitsPerPartner: 0,
                    avgVisitsPerInstallation: 0,
                    strongRelationships: 0,
                    recentVisits: 0
                }
            };

            analysis.summary = {
                avgVisitsPerPartner: analysis.totalVisits / analysis.uniquePartners,
                avgVisitsPerInstallation: analysis.totalVisits / analysis.uniqueInstallations,
                strongRelationships: analysis.partnerInstallationPairs.filter(p => p.visitCount >= 5).length,
                recentVisits: visitsData.filter(v => this.isRecentVisit(v.visit_date)).length
            };

            return analysis;

        } catch (error) {
            logger.error('Visit data analysis failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    groupVisitsByPartner(visits: VisitData[]): Record<string, VisitData[]> {
        return visits.reduce((groups, visit) => {
            const partnerId = visit.partner_id;
            if (!groups[partnerId]) {
                groups[partnerId] = [];
            }
            groups[partnerId].push(visit);
            return groups;
        }, {} as Record<string, VisitData[]>);
    }

    groupVisitsByInstallation(visits: VisitData[]): Record<string, VisitData[]> {
        return visits.reduce((groups, visit) => {
            const installationCode = visit.installation_code;
            if (!groups[installationCode]) {
                groups[installationCode] = [];
            }
            groups[installationCode].push(visit);
            return groups;
        }, {} as Record<string, VisitData[]>);
    }

    async analyzeVisitFrequency(visits: VisitData[]): Promise<Record<string, VisitFrequencyData>> {
        try {
            logger.info('Analyzing visit frequency patterns');
            
            const frequencyData: Record<string, VisitFrequencyData> = {};
            const pairs = this.identifyPartnerInstallationPairs(visits);

            for (const pair of pairs) {
                const key = `${pair.partnerId}-${pair.installationCode}`;
                const averageInterval = this.calculateAverageVisitInterval(pair.visits);
                
                frequencyData[key] = {
                    partnerId: pair.partnerId,
                    installationCode: pair.installationCode,
                    frequency: this.categorizeFrequency(averageInterval),
                    averageInterval,
                    totalVisits: pair.visitCount,
                    lastVisit: pair.lastVisit
                };
            }

            return frequencyData;

        } catch (error) {
            logger.error('Visit frequency analysis failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return {};
        }
    }

    async analyzeTemporalPatterns(visits: VisitData[]): Promise<Record<string, TemporalPattern>> {
        try {
            logger.info('Analyzing temporal patterns in visit data');
            
            const temporalData: Record<string, TemporalPattern> = {};
            const pairs = this.identifyPartnerInstallationPairs(visits);

            for (const pair of pairs) {
                const key = `${pair.partnerId}-${pair.installationCode}`;
                const pattern = this.analyzeVisitPattern(pair.visits);
                
                temporalData[key] = {
                    partnerId: pair.partnerId,
                    installationCode: pair.installationCode,
                    seasonality: pattern.seasonality,
                    monthlyDistribution: pattern.monthlyDistribution,
                    dayOfWeekDistribution: pattern.dayOfWeekDistribution,
                    peakPeriods: pattern.peakPeriods
                };
            }

            return temporalData;

        } catch (error) {
            logger.error('Temporal patterns analysis failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return {};
        }
    }

    identifyPartnerInstallationPairs(visits: VisitData[]): PartnerInstallationPair[] {
        const pairs: Record<string, PartnerInstallationPair> = {};
        
        visits.forEach(visit => {
            const key = `${visit.partner_id}-${visit.installation_code}`;
            
            if (!pairs[key]) {
                pairs[key] = {
                    partnerId: visit.partner_id,
                    partnerName: visit.partners?.name || 'Unknown',
                    installationCode: visit.installation_code,
                    installationName: visit.installations?.company_name || 'Unknown',
                    visits: [],
                    visitCount: 0,
                    firstVisit: visit.visit_date,
                    lastVisit: visit.visit_date
                };
            }
            
            pairs[key].visits.push(visit);
            pairs[key].visitCount++;
            
            if (visit.visit_date < pairs[key].firstVisit) {
                pairs[key].firstVisit = visit.visit_date;
            }
            if (visit.visit_date > pairs[key].lastVisit) {
                pairs[key].lastVisit = visit.visit_date;
            }
        });

        return Object.values(pairs).filter(pair => pair.visitCount > 0);
    }

    async calculateRelationshipStrength(pair: PartnerInstallationPair): Promise<RelationshipStrength> {
        try {
            let score = 0;
            const factors = {
                visitFrequency: 0,
                recency: 0,
                consistency: 0,
                serviceMatch: 0
            };

            const visitFrequencyScore = this.calculateVisitFrequencyScore(pair);
            score += visitFrequencyScore * 0.4;
            factors.visitFrequency = visitFrequencyScore;

            const recencyScore = this.calculateRecencyScore(pair.lastVisit);
            score += recencyScore * 0.25;
            factors.recency = recencyScore;

            const consistencyScore = this.calculateConsistencyScore(pair.visits);
            score += consistencyScore * 0.2;
            factors.consistency = consistencyScore;

            const serviceMatchScore = await this.calculateServiceMatchScore(pair);
            score += serviceMatchScore * 0.15;
            factors.serviceMatch = serviceMatchScore;

            let type: RelationshipStrength['type'] = 'weak';
            if (score >= 0.9) type = 'exclusive';
            else if (score >= 0.8) type = 'primary';
            else if (score >= 0.7) type = 'regular';
            else if (score >= 0.5) type = 'occasional';

            return {
                score: Math.min(1.0, score),
                type,
                factors
            };

        } catch (error) {
            logger.error('Relationship strength calculation failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return { score: 0, type: 'unknown', factors: { visitFrequency: 0, recency: 0, consistency: 0, serviceMatch: 0 } };
        }
    }

    private calculateVisitFrequencyScore(pair: PartnerInstallationPair): number {
        if (pair.visitCount >= 20) return 1.0;
        if (pair.visitCount >= 10) return 0.8;
        if (pair.visitCount >= 5) return 0.6;
        if (pair.visitCount >= 3) return 0.4;
        return 0.2;
    }

    private calculateRecencyScore(lastVisit: string): number {
        const daysSinceLastVisit = (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastVisit <= 30) return 1.0;
        if (daysSinceLastVisit <= 90) return 0.8;
        if (daysSinceLastVisit <= 180) return 0.6;
        if (daysSinceLastVisit <= 365) return 0.4;
        return 0.2;
    }

    private calculateConsistencyScore(visits: VisitData[]): number {
        if (visits.length < 2) return 0.5;
        
        const sortedVisits = visits.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
        const intervals: number[] = [];
        
        for (let i = 1; i < sortedVisits.length; i++) {
            const interval = (new Date(sortedVisits[i].visit_date).getTime() - new Date(sortedVisits[i-1].visit_date).getTime()) / (1000 * 60 * 60 * 24);
            intervals.push(interval);
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const standardDeviation = Math.sqrt(variance);
        
        const consistencyScore = Math.max(0, 1 - (standardDeviation / avgInterval));
        return Math.min(1, consistencyScore);
    }

    private calculateAverageVisitInterval(visits: VisitData[]): number {
        if (visits.length < 2) return 365;
        
        const sortedVisits = visits.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
        const intervals: number[] = [];
        
        for (let i = 1; i < sortedVisits.length; i++) {
            const interval = (new Date(sortedVisits[i].visit_date).getTime() - new Date(sortedVisits[i-1].visit_date).getTime()) / (1000 * 60 * 60 * 24);
            intervals.push(interval);
        }
        
        return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    private categorizeFrequency(averageInterval: number): VisitFrequencyData['frequency'] {
        if (averageInterval <= 7) return 'daily';
        if (averageInterval <= 14) return 'weekly';
        if (averageInterval <= 45) return 'monthly';
        if (averageInterval <= 120) return 'quarterly';
        if (averageInterval <= 400) return 'yearly';
        return 'irregular';
    }

    private analyzeVisitPattern(visits: VisitData[]) {
        const monthlyDistribution: Record<string, number> = {};
        const dayOfWeekDistribution: Record<string, number> = {};
        const seasonalCounts = { spring: 0, summer: 0, autumn: 0, winter: 0 };

        for (let i = 1; i <= 12; i++) {
            monthlyDistribution[i.toString()] = 0;
        }
        for (let i = 0; i < 7; i++) {
            dayOfWeekDistribution[i.toString()] = 0;
        }

        visits.forEach(visit => {
            const date = new Date(visit.visit_date);
            const month = date.getMonth() + 1;
            const dayOfWeek = date.getDay();

            monthlyDistribution[month.toString()]++;
            dayOfWeekDistribution[dayOfWeek.toString()]++;

            if (month >= 3 && month <= 5) seasonalCounts.spring++;
            else if (month >= 6 && month <= 8) seasonalCounts.summer++;
            else if (month >= 9 && month <= 11) seasonalCounts.autumn++;
            else seasonalCounts.winter++;
        });

        const maxSeason = Object.entries(seasonalCounts).reduce((a, b) => 
            seasonalCounts[a[0] as keyof typeof seasonalCounts] > seasonalCounts[b[0] as keyof typeof seasonalCounts] ? a : b
        );
        const seasonality = maxSeason[1] > visits.length * 0.4 ? maxSeason[0] as TemporalPattern['seasonality'] : 'none';

        const peakPeriods = Object.entries(monthlyDistribution)
            .filter(([_, count]) => count > visits.length * 0.15)
            .map(([month, count]) => ({
                period: this.getMonthName(parseInt(month)),
                intensity: count / visits.length
            }))
            .sort((a, b) => b.intensity - a.intensity);

        return {
            seasonality,
            monthlyDistribution,
            dayOfWeekDistribution,
            peakPeriods
        };
    }

    private isRecentVisit(visitDate: string): boolean {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(visitDate) >= sixMonthsAgo;
    }

    private getMonthName(month: number): string {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || 'Unknown';
    }

    private async calculateServiceMatchScore(pair: PartnerInstallationPair): Promise<number> {
        try {
            const { data: partner } = await supabaseAdmin
                .from('partners')
                .select('specialty')
                .eq('id', pair.partnerId)
                .single();

            const { data: installation } = await supabaseAdmin
                .from('installations')
                .select('category')
                .eq('installation_code', pair.installationCode)
                .single();

            if (!partner || !installation) return 0.5;

            const serviceTypes = new Set(pair.visits.map(v => v.service_type).filter(Boolean));
            const specialtyMatch = Array.from(serviceTypes).some(service => 
                this.isSpecialtyMatch(partner.specialty, service!)
            );

            return specialtyMatch ? 1.0 : 0.3;

        } catch (error) {
            logger.error('Service match score calculation failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return 0.5;
        }
    }

    private isSpecialtyMatch(specialty: string, serviceType: string): boolean {
        const specialtyLower = specialty.toLowerCase();
        const serviceLower = serviceType.toLowerCase();
        
        return specialtyLower.includes(serviceLower) || 
               serviceLower.includes(specialtyLower) ||
               (specialtyLower.includes('doctor') && serviceLower.includes('medical')) ||
               (specialtyLower.includes('occupational') && serviceLower.includes('health'));
    }
}