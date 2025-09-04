import BaseScheduler from './BaseScheduler';
import { Logger, Partner } from '../../types';

const logger: Logger = require('../../utils/logger');

interface AnthropicClient {
  baseURL: string;
  headers: Record<string, string>;
}

interface AnthropicResponse {
  id: string;
  model: string;
  content: Array<{
    type: string;
    text?: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface SchedulingContext {
  installation: {
    installation_code: string;
    address: string;
    service_type: string;
    work_hours: string;
    special_requirements?: string;
  };
  contract: {
    contract_value: number;
  };
  regulatoryRequirements: {
    totalHours: number;
    minimumHoursPerMonth: number;
  };
  constraints: {
    excludeWeekends?: boolean;
  };
  historicalData?: any[];
  availablePartners: Partner[];
}

/**
 * Anthropic API Scheduler
 * Uses Claude AI for intelligent partner assignment and scheduling decisions
 * Leverages natural language processing and advanced reasoning capabilities
 */
class AnthropicScheduler extends BaseScheduler {
    private apiKey: string;
    private model: string;
    private maxTokens: number;
    private temperature: number;
    private maxRetries: number;
    private requestTimeout: number;
    private enableCache: boolean;
    private anthropicClient: AnthropicClient | null;
    private requestCache: Map<string, any>;
    private cacheExpiryTime: number;

    constructor(config: any) {
        super(config);
        this.apiKey = process.env.ANTHROPIC_API_KEY || this.parameters.api_key;
        this.model = this.parameters.model || 'claude-3-5-sonnet-20241022';
        this.maxTokens = this.parameters.max_tokens || 2000;
        this.temperature = this.parameters.temperature || 0.3;
        this.maxRetries = this.parameters.max_retries || 3;
        this.requestTimeout = this.parameters.request_timeout || 30000;
        this.enableCache = this.parameters.enable_cache !== false;
        
        // API client setup
        this.anthropicClient = null;
        this.requestCache = new Map();
        this.cacheExpiryTime = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Initialize the Anthropic scheduler
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing AnthropicScheduler');
            
            if (!this.apiKey) {
                throw new Error('Anthropic API key is required but not provided');
            }

            // Initialize Anthropic client
            this.anthropicClient = {
                baseURL: 'https://api.anthropic.com/v1/messages',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                }
            };

            // Test connection
            await this.testConnection();
            
            this.isInitialized = true;
            logger.info('AnthropicScheduler initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize AnthropicScheduler:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Generate schedule using Anthropic Claude AI
     */
    async generateSchedule(context: SchedulingContext): Promise<any> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            logger.info('Generating AI-powered schedule using Anthropic Claude', { 
                installationCode: context.installation.installation_code,
                partnerCount: context.availablePartners.length 
            });

            const startTime = Date.now();

            // Prepare context for AI analysis
            const aiContext = this.prepareAIContext(context);
            
            // Generate AI-powered partner recommendation
            const aiRecommendation = await this.getAIRecommendation(aiContext);
            
            // Parse AI response
            const recommendation = this.parseAIRecommendation(aiRecommendation);
            
            if (!recommendation.success) {
                return {
                    feasible: false,
                    optimizationScore: 0,
                    partnerId: null,
                    totalHours: 0,
                    reasoning: recommendation.reasoning,
                    executionTime: Date.now() - startTime,
                    algorithm: this.name
                };
            }

            // Find recommended partner
            const selectedPartner = context.availablePartners.find(p => 
                p.id === recommendation.partnerId
            );

            if (!selectedPartner) {
                return {
                    feasible: false,
                    optimizationScore: 0,
                    partnerId: recommendation.partnerId,
                    totalHours: 0,
                    reasoning: 'Recommended partner not found in available partners',
                    executionTime: Date.now() - startTime,
                    algorithm: this.name
                };
            }

            // Generate visit schedule using AI recommendations
            const schedule = await this.generateAIOptimizedSchedule(
                selectedPartner, 
                context, 
                recommendation
            );

            const result = {
                feasible: true,
                optimizationScore: recommendation.confidence,
                partnerId: selectedPartner.id,
                partnerName: selectedPartner.name,
                totalHours: schedule.totalHours,
                visits: schedule.visits,
                reasoning: recommendation.reasoning,
                aiConfidence: recommendation.confidence,
                executionTime: Date.now() - startTime,
                algorithm: this.name,
                tokenUsage: recommendation.tokenUsage
            };

            this.logMetrics(result.executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('Anthropic scheduling failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            
            // Fallback to base scheduler logic
            return this.fallbackScheduling(context);
        }
    }

    /**
     * Test API connection
     */
    private async testConnection(): Promise<void> {
        try {
            const testPrompt = 'Hello, please respond with "Connection successful" to confirm API connectivity.';
            
            const response = await this.makeAPIRequest({
                model: this.model,
                max_tokens: 50,
                messages: [{ role: 'user', content: testPrompt }]
            });

            if (!response?.content?.[0]?.text?.includes('successful')) {
                throw new Error('API test failed - unexpected response');
            }

            logger.info('Anthropic API connection test successful');

        } catch (error) {
            logger.error('Anthropic API connection test failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw new Error('Failed to establish connection with Anthropic API');
        }
    }

    /**
     * Prepare context for AI analysis
     */
    private prepareAIContext(context: SchedulingContext): string {
        const partnersInfo = context.availablePartners.map(partner => ({
            id: partner.id,
            name: partner.name,
            specialty: partner.specialty,
            city: partner.city,
            hourly_rate: partner.hourly_rate,
            max_hours_per_week: partner.max_hours_per_week,
            is_active: partner.is_active
        }));

        return `
You are an expert scheduling consultant for occupational health services in Greece.

INSTALLATION REQUIREMENTS:
- Code: ${context.installation.installation_code}
- Service Type: ${context.installation.service_type}
- Location: ${context.installation.address}
- Working Hours: ${context.installation.work_hours}
- Special Requirements: ${context.installation.special_requirements || 'None'}

CONTRACT DETAILS:
- Budget: €${context.contract.contract_value}
- Required Hours: ${context.regulatoryRequirements.totalHours} total
- Monthly Hours: ${context.regulatoryRequirements.minimumHoursPerMonth}

AVAILABLE PARTNERS:
${JSON.stringify(partnersInfo, null, 2)}

HISTORICAL DATA:
${context.historicalData?.length ? 
  'Previous assignments available for analysis' : 
  'No historical data available'}

Please analyze and recommend the best partner considering:
1. Specialty match with service requirements
2. Geographic proximity to reduce travel costs
3. Cost efficiency within budget constraints
4. Availability and capacity
5. Quality and reliability indicators

Respond with a JSON object containing:
{
  "partnerId": "selected_partner_id",
  "confidence": 0.95,
  "reasoning": "detailed explanation of selection rationale",
  "riskFactors": ["list", "of", "potential", "risks"],
  "recommendations": ["specific", "scheduling", "recommendations"]
}
        `.trim();
    }

    /**
     * Get AI recommendation from Claude
     */
    private async getAIRecommendation(context: string): Promise<string> {
        const cacheKey = this.generateCacheKey(context);
        
        // Check cache first
        if (this.enableCache) {
            const cached = this.getCachedResponse(cacheKey);
            if (cached) {
                logger.info('Using cached AI response');
                return cached;
            }
        }

        const requestBody = {
            model: this.model,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            messages: [
                {
                    role: 'user',
                    content: context
                }
            ]
        };

        const response = await this.makeAPIRequest(requestBody);
        const aiResponse = response.content[0]?.text || '';

        // Cache the response
        if (this.enableCache) {
            this.setCachedResponse(cacheKey, aiResponse);
        }

        return aiResponse;
    }

    /**
     * Make API request to Anthropic
     */
    private async makeAPIRequest(body: any): Promise<AnthropicResponse> {
        if (!this.anthropicClient) {
            throw new Error('Anthropic client not initialized');
        }

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

                const response = await fetch(this.anthropicClient.baseURL, {
                    method: 'POST',
                    headers: this.anthropicClient.headers,
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API request failed: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                return data as AnthropicResponse;

            } catch (error) {
                logger.warn(`Anthropic API request attempt ${attempt} failed`, { 
                    error: error instanceof Error ? error.message : String(error) 
                });

                if (attempt === this.maxRetries) {
                    throw error;
                }

                // Wait before retry (exponential backoff)
                await this.sleep(Math.pow(2, attempt) * 1000);
            }
        }

        throw new Error('All API request attempts failed');
    }

    /**
     * Parse AI recommendation response
     */
    private parseAIRecommendation(aiResponse: string): any {
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            
            if (!jsonMatch) {
                return {
                    success: false,
                    reasoning: 'Failed to parse AI response - no JSON found',
                    confidence: 0
                };
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            return {
                success: true,
                partnerId: parsed.partnerId,
                confidence: Math.min(1.0, Math.max(0, parsed.confidence || 0.5)),
                reasoning: parsed.reasoning || 'AI recommendation provided',
                riskFactors: parsed.riskFactors || [],
                recommendations: parsed.recommendations || [],
                tokenUsage: parsed.tokenUsage
            };

        } catch (error) {
            logger.warn('Failed to parse AI recommendation:', { 
                error: error instanceof Error ? error.message : String(error),
                response: aiResponse.substring(0, 200) 
            });

            return {
                success: false,
                reasoning: 'Failed to parse AI response - invalid JSON format',
                confidence: 0
            };
        }
    }

    /**
     * Generate AI-optimized schedule
     */
    private async generateAIOptimizedSchedule(
        partner: Partner, 
        context: SchedulingContext, 
        recommendation: any
    ): Promise<any> {
        // Use base scheduler's visit generation with AI recommendations
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() + 1);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 12);

        const baseSchedule = this.generateVisitSchedule(
            partner, 
            context, 
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        // Apply AI recommendations if available
        if (recommendation.recommendations?.length > 0) {
            // Could enhance schedule based on AI suggestions
            // For now, use base schedule with AI confidence
        }

        return baseSchedule;
    }

    /**
     * Fallback to rule-based scheduling when AI fails
     */
    private async fallbackScheduling(context: SchedulingContext): Promise<any> {
        logger.info('Using fallback scheduling due to AI failure');

        if (context.availablePartners.length === 0) {
            return {
                feasible: false,
                optimizationScore: 0,
                partnerId: null,
                totalHours: 0,
                reasoning: 'No partners available',
                algorithm: `${this.name} (fallback)`
            };
        }

        // Simple fallback: use first available partner with highest score
        let bestPartner = context.availablePartners[0];
        let bestScore = 0;

        for (const partner of context.availablePartners) {
            const score = this.calculateCompositeScore(partner, context);
            if (score.compositeScore > bestScore) {
                bestScore = score.compositeScore;
                bestPartner = partner;
            }
        }

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() + 1);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 12);

        const schedule = this.generateVisitSchedule(
            bestPartner, 
            context, 
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        return {
            feasible: true,
            optimizationScore: bestScore,
            partnerId: bestPartner.id,
            partnerName: bestPartner.name,
            totalHours: schedule.totalHours,
            visits: schedule.visits,
            reasoning: 'Fallback scheduling used due to AI service unavailability',
            algorithm: `${this.name} (fallback)`
        };
    }

    /**
     * Cache management
     */
    private generateCacheKey(context: string): string {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < context.length; i++) {
            const char = context.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `anthropic_${Math.abs(hash)}`;
    }

    private getCachedResponse(key: string): string | null {
        const cached = this.requestCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryTime) {
            return cached.response;
        }
        return null;
    }

    private setCachedResponse(key: string, response: string): void {
        this.requestCache.set(key, {
            response,
            timestamp: Date.now()
        });
    }

    /**
     * Utility functions
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.requestCache.clear();
        logger.info('Anthropic scheduler cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): any {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        this.requestCache.forEach(cached => {
            if ((now - cached.timestamp) < this.cacheExpiryTime) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        });

        return {
            totalEntries: this.requestCache.size,
            validEntries,
            expiredEntries,
            cacheHitRate: validEntries / Math.max(1, this.requestCache.size)
        };
    }
}

export default AnthropicScheduler;