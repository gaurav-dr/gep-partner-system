import { Anthropic } from '@anthropic-ai/sdk';
import { Logger, CustomerRequest, Partner } from '../types';

const logger: Logger = require('../utils/logger');

interface SchedulingContext {
  customerRequests: CustomerRequest[];
  availablePartners: Partner[];
  constraints?: {
    maxDistance?: number;
    preferredPartners?: string[];
    excludedPartners?: string[];
  };
}

interface AIScheduleResult {
  success: boolean;
  assignments?: Array<{
    partnerId: string;
    requestId: number;
    confidence: number;
    reasoning: string;
  }>;
  recommendations?: string[];
  warnings?: string[];
}

interface QueuedRequest {
  type: string;
  prompt: string;
  context: any;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timestamp: number;
}

interface GeneratedCustomerData {
  name: string;
  location: string;
  employeeCount: number;
  serviceType: 'occupational_doctor' | 'safety_engineer';
  urgency: 'low' | 'medium' | 'high';
  specialRequirements?: string[];
  budget: number;
  contactEmail: string;
  contactPhone: string;
}

/**
 * Anthropic API Integration Service
 * Provides advanced AI capabilities for intelligent scheduling decisions
 * Integrates with Claude API for complex optimization and decision making
 */
class AnthropicIntegration {
    private client: Anthropic;
    private maxTokens: number;
    private temperature: number;
    private model: string;
    private responseCache: Map<string, any>;
    private cacheExpiry: number;
    private requestQueue: QueuedRequest[];
    private isProcessing: boolean;
    private maxRequestsPerMinute: number;
    private requestTimes: number[];

    constructor() {
        this.client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        
        this.maxTokens = 4000;
        this.temperature = 0.1; // Low temperature for consistent, logical responses
        this.model = 'claude-3-5-sonnet-20241022';
        
        // Cache for frequently used prompts and responses
        this.responseCache = new Map();
        this.cacheExpiry = 1000 * 60 * 30; // 30 minutes
        
        // Rate limiting
        this.requestQueue = [];
        this.isProcessing = false;
        this.maxRequestsPerMinute = 50;
        this.requestTimes = [];
    }

    /**
     * Generate optimized schedule using Claude AI
     */
    async generateOptimizedSchedule(schedulingContext: SchedulingContext): Promise<AIScheduleResult> {
        try {
            logger.info('Generating AI-optimized schedule using Anthropic Claude');

            // Prepare the scheduling prompt
            const prompt = this.buildSchedulingPrompt(schedulingContext);
            
            // Add request to queue and process
            const result = await this.queueRequest('schedule_optimization', prompt, schedulingContext);
            
            return this.parseSchedulingResult(result);

        } catch (error) {
            logger.error('Failed to generate optimized schedule:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return {
                success: false,
                warnings: ['AI scheduling failed, falling back to rule-based optimization']
            };
        }
    }

    /**
     * Predict scheduling risks and bottlenecks
     */
    async predictSchedulingRisks(scheduleData: any, historicalMetrics: any): Promise<any> {
        try {
            logger.info('Predicting scheduling risks using AI analysis');

            const prompt = this.buildRiskPredictionPrompt(scheduleData, historicalMetrics);
            
            return await this.queueRequest('risk_prediction', prompt, { scheduleData, historicalMetrics });

        } catch (error) {
            logger.error('Failed to predict scheduling risks:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Generate regulatory compliance insights
     */
    async generateComplianceInsights(complianceData: any, regulations: any): Promise<any> {
        try {
            logger.info('Generating regulatory compliance insights with AI');

            const prompt = this.buildComplianceInsightsPrompt(complianceData, regulations);
            
            return await this.queueRequest('compliance_insights', prompt, { complianceData, regulations });

        } catch (error) {
            logger.error('Failed to generate compliance insights:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Queue request for rate-limited processing
     */
    private async queueRequest(type: string, prompt: string, context: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                type,
                prompt,
                context,
                resolve,
                reject,
                timestamp: Date.now()
            });

            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process queued requests with rate limiting
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.requestQueue.length > 0) {
                // Check rate limiting
                const now = Date.now();
                this.requestTimes = this.requestTimes.filter(time => now - time < 60000); // Last minute

                if (this.requestTimes.length >= this.maxRequestsPerMinute) {
                    logger.warn('Rate limit reached, waiting before processing next request');
                    await this.sleep(1000);
                    continue;
                }

                const request = this.requestQueue.shift()!;
                
                try {
                    const result = await this.makeAnthropicRequest(request.prompt, request.type);
                    this.requestTimes.push(now);
                    request.resolve(result);
                } catch (error) {
                    request.reject(error);
                }

                // Brief pause between requests
                await this.sleep(100);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Make actual request to Anthropic API
     */
    private async makeAnthropicRequest(prompt: string, requestType: string): Promise<any> {
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(prompt);
            const cachedResponse = this.responseCache.get(cacheKey);
            
            if (cachedResponse && (Date.now() - cachedResponse.timestamp) < this.cacheExpiry) {
                logger.info('Using cached Anthropic response', { requestType });
                return cachedResponse.data;
            }

            const message = await this.client.messages.create({
                model: this.model,
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                messages: [{ role: 'user', content: prompt }]
            });

            const result = message.content[0];
            const responseText = 'text' in result ? result.text : '';

            // Cache the response
            this.responseCache.set(cacheKey, {
                data: responseText,
                timestamp: Date.now()
            });

            logger.info('Anthropic API request completed', { 
                requestType, 
                tokenCount: message.usage?.output_tokens || 0 
            });

            return responseText;

        } catch (error) {
            logger.error('Anthropic API request failed:', { 
                requestType,
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Build scheduling optimization prompt
     */
    private buildSchedulingPrompt(context: SchedulingContext): string {
        const { customerRequests, availablePartners, constraints } = context;
        
        return `
You are an expert scheduling consultant for occupational health services in Greece. 
Analyze the following customer requests and available partners to create optimal assignments.

CUSTOMER REQUESTS:
${customerRequests.map(req => `
- Request ID: ${req.id}
- Client: ${req.client_name}
- Service Type: ${req.service_type}
- Location: ${req.installation_address}
- Employee Count: ${req.employee_count}
- Estimated Hours: ${req.estimated_hours}
- Timeline: ${req.start_date} to ${req.end_date}
- Special Requirements: ${req.special_requirements || 'None'}
`).join('\n')}

AVAILABLE PARTNERS:
${availablePartners.map(partner => `
- Partner ID: ${partner.id}
- Name: ${partner.name}
- Specialty: ${partner.specialty}
- Location: ${partner.city}
- Rate: €${partner.hourly_rate}/hour
- Max Hours/Week: ${partner.max_hours_per_week}
`).join('\n')}

CONSTRAINTS:
${constraints ? JSON.stringify(constraints, null, 2) : 'No additional constraints'}

Please provide optimal partner assignments considering:
1. Specialty matching (occupational doctor vs safety engineer)
2. Geographic proximity 
3. Availability and capacity
4. Cost optimization
5. Quality of service

Respond with a JSON object containing assignments, confidence scores, and reasoning.
        `.trim();
    }

    /**
     * Build risk prediction prompt
     */
    private buildRiskPredictionPrompt(scheduleData: any, historicalMetrics: any): string {
        return `
Analyze the following schedule data and historical metrics to identify potential risks and bottlenecks:

SCHEDULE DATA:
${JSON.stringify(scheduleData, null, 2)}

HISTORICAL METRICS:
${JSON.stringify(historicalMetrics, null, 2)}

Identify risks related to:
- Partner availability conflicts
- Geographic coverage gaps
- Regulatory compliance issues
- Quality assurance concerns
- Budget overruns

Provide actionable recommendations to mitigate identified risks.
        `.trim();
    }

    /**
     * Build compliance insights prompt
     */
    private buildComplianceInsightsPrompt(complianceData: any, regulations: any): string {
        return `
Generate regulatory compliance insights for Greek occupational health regulations:

COMPLIANCE DATA:
${JSON.stringify(complianceData, null, 2)}

APPLICABLE REGULATIONS:
${JSON.stringify(regulations, null, 2)}

Analyze compliance status and provide recommendations for:
- Legal requirement adherence
- Documentation completeness
- Service quality standards
- Partner certification requirements
- Audit preparation
        `.trim();
    }

    /**
     * Parse scheduling result from AI response
     */
    private parseSchedulingResult(aiResponse: string): AIScheduleResult {
        try {
            // Attempt to parse JSON response
            const parsed = JSON.parse(aiResponse);
            return {
                success: true,
                assignments: parsed.assignments || [],
                recommendations: parsed.recommendations || [],
                warnings: parsed.warnings || []
            };
        } catch (error) {
            // If not JSON, treat as text response
            return {
                success: false,
                warnings: [`Unable to parse AI response: ${aiResponse.substring(0, 200)}...`]
            };
        }
    }

    /**
     * Generate customer request data for testing
     */
    async generateCustomerRequest(): Promise<GeneratedCustomerData> {
        try {
            const prompt = `
Generate a realistic customer request for occupational health services in Greece.

Requirements:
- Greek company name (can be transliterated)
- Greek city/location
- Realistic employee count (10-500)
- Service type: either 'occupational_doctor' or 'safety_engineer'
- Appropriate budget range
- Valid Greek phone number format
- Realistic special requirements

Respond with JSON format:
{
  "name": "company name",
  "location": "city, Greece", 
  "employeeCount": number,
  "serviceType": "occupational_doctor" | "safety_engineer",
  "urgency": "low" | "medium" | "high",
  "specialRequirements": ["requirement1", "requirement2"],
  "budget": number,
  "contactEmail": "email@company.gr",
  "contactPhone": "+30 xxx xxx xxxx"
}
            `.trim();

            const response = await this.queueRequest('generate_customer', prompt, {});
            
            try {
                const customerData = JSON.parse(response);
                logger.info('Generated customer request data', { 
                    companyName: customerData.name,
                    location: customerData.location 
                });
                return customerData;
            } catch (parseError) {
                // Fallback to predefined data if parsing fails
                return this.generateFallbackCustomerData();
            }

        } catch (error) {
            logger.error('Failed to generate customer request:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return this.generateFallbackCustomerData();
        }
    }

    /**
     * Generate fallback customer data when AI fails
     */
    private generateFallbackCustomerData(): GeneratedCustomerData {
        const companies = [
            'ΕΛΛΗΝΙΚΗ ΒΙΟΜΗΧΑΝΙΑ ΑΕ',
            'ΜΕΓΑΛΕΞΑΝΔΡΟΣ ΕΤΑΙΡΙΑ',
            'ΑΤΤΙΚΗ ΤΕΧΝΟΛΟΓΙΕΣ',
            'ΘΕΣΣΑΛΟΝΙΚΗ ΕΡΓΟΣΤΑΣΙΑ'
        ];
        
        const cities = ['ΑΘΗΝΑ', 'ΘΕΣΣΑΛΟΝΙΚΗ', 'ΠΑΤΡΑ', 'ΗΡΑΚΛΕΙΟ', 'ΛΑΡΙΣΑ'];
        const serviceTypes: ('occupational_doctor' | 'safety_engineer')[] = ['occupational_doctor', 'safety_engineer'];
        const urgencyLevels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];

        const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        
        const company = companies[Math.floor(Math.random() * companies.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];

        return {
            name: company,
            location: `${city}, Greece`,
            employeeCount: randomRange(15, 300),
            serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
            urgency: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
            specialRequirements: ['Εκτεταμένες εργασίες', 'Ειδικός εξοπλισμός'],
            budget: randomRange(2000, 15000),
            contactEmail: `info@${company.toLowerCase().replace(/[^a-z]/g, '')}.gr`,
            contactPhone: `+30 ${randomRange(210, 299)} ${randomRange(100, 999)} ${randomRange(1000, 9999)}`
        };
    }

    /**
     * Generate cache key for responses
     */
    private generateCacheKey(prompt: string): string {
        // Simple hash function for caching
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Sleep utility for rate limiting
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear response cache
     */
    clearCache(): void {
        this.responseCache.clear();
        logger.info('Anthropic response cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; hitRate: number } {
        return {
            size: this.responseCache.size,
            hitRate: 0 // Would need to track hits vs misses
        };
    }
}

export default AnthropicIntegration;