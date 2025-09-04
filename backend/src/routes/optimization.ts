import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger, OptimizationRequest, OptimizationConstraints, OptimizationResult } from '../types';
import OptimizationEngine from '../services/OptimizationEngine';

const { supabase, supabaseAdmin } = require('../config/supabase');
const logger: Logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');
const EmailService = require('../services/EmailService');

const router = express.Router();

// Validation schema for optimization request
const optimizationSchema = Joi.object({
  requestId: Joi.number().integer().required(),
  forceReassign: Joi.boolean().default(false),
  constraints: Joi.object({
    maxDistance: Joi.number().min(1).max(500).default(50),
    preferredPartners: Joi.array().items(Joi.string().pattern(/^R\d{5}$/)).default([]),
    excludedPartners: Joi.array().items(Joi.string().pattern(/^R\d{5}$/)).default([]),
    maxHourlyRate: Joi.number().min(0).max(1000)
  }).default({})
});

interface OptimizationRequestBody {
  requestId: number;
  forceReassign?: boolean;
  constraints?: OptimizationConstraints;
}

interface TestOptimizationRequest {
  serviceType?: string;
  constraints?: OptimizationConstraints;
}

// POST /api/optimization/assign - Run optimization and create assignment
router.post('/assign', validateRequest(optimizationSchema), async (req: Request<{}, any, OptimizationRequestBody>, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  try {
    const { requestId, forceReassign = false, constraints = {} } = req.body;

    // Get customer request details
    const { data: request, error: requestError } = await supabase
      .from('customer_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError) {
      if (requestError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer request not found' });
      }
      throw requestError;
    }

    // Check if already assigned and not forcing reassignment
    if (request.status === 'assigned' && !forceReassign) {
      return res.status(400).json({
        error: 'Request already assigned. Use forceReassign=true to reassign.'
      });
    }

    // Get available partners for the service type
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select(`
        *,
        partner_availability (
          date,
          available_hours,
          booked_hours,
          is_available
        )
      `)
      .eq('is_active', true)
      .ilike('specialty', request.service_type === 'occupational_doctor' ? '%Doctor%' : '%Engineer%');

    if (partnersError) throw partnersError;

    if (partners.length === 0) {
      return res.status(404).json({
        error: 'No available partners found for the requested service type'
      });
    }

    // Initialize optimization engine
    const optimizationEngine = new OptimizationEngine({
      maxDistance: constraints.maxDistance || 50,
      weights: {
        location: 0.4,
        availability: 0.3,
        cost: 0.2,
        specialty: 0.1,
        performance: 0.0
      }
    });

    // Run optimization
    logger.info('Starting optimization process', {
      requestId,
      partnersCount: partners.length,
      serviceType: request.service_type
    });

    const optimizationResult: OptimizationResult = await optimizationEngine.optimize(request, partners, constraints);

    if (!optimizationResult || !optimizationResult.selectedPartner) {
      return res.status(400).json({
        error: 'No suitable partner found for assignment',
        evaluation: optimizationResult?.evaluation || {}
      });
    }

    const executionTime = Date.now() - startTime;

    // Create assignment record
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .insert([{
        request_id: requestId,
        partner_id: optimizationResult.selectedPartner.id,
        installation_code: null, // Will be populated if installation data is available
        service_type: request.service_type,
        assigned_hours: request.estimated_hours || 20,
        hourly_rate: optimizationResult.selectedPartner.hourly_rate,
        status: 'proposed',
        optimization_score: optimizationResult.selectedPartner.score,
        travel_distance: optimizationResult.selectedPartner.distance,
        response_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }])
      .select()
      .single();

    if (assignmentError) throw assignmentError;

    // Save optimization results for audit
    const { error: optimizationLogError } = await supabaseAdmin
      .from('optimization_results')
      .insert([{
        request_id: requestId,
        algorithm_version: 'v1.0',
        execution_time_ms: executionTime,
        total_partners_evaluated: partners.length,
        top_candidates: JSON.stringify(optimizationResult.topCandidates || []),
        selected_partner_id: optimizationResult.selectedPartner.id,
        optimization_parameters: JSON.stringify({
          constraints,
          weights: optimizationEngine.weights
        })
      }]);

    if (optimizationLogError) {
      logger.warn('Failed to save optimization results', optimizationLogError);
    }

    // Update customer request status
    const { error: updateError } = await supabaseAdmin
      .from('customer_requests')
      .update({
        status: 'assigned',
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Send email notification to partner
    try {
      const emailService = new EmailService();
      await emailService.sendAssignmentNotification(
        optimizationResult.selectedPartner,
        request,
        assignment
      );

      // Log email sent
      await supabaseAdmin
        .from('email_log')
        .insert([{
          assignment_id: assignment.id,
          recipient_email: optimizationResult.selectedPartner.email,
          email_type: 'assignment_notification',
          subject: `New Assignment Opportunity - ${request.client_name}`,
          delivery_status: 'sent'
        }]);

    } catch (emailError) {
      logger.error('Failed to send assignment email', {
        error: (emailError as Error).message,
        assignmentId: assignment.id,
        partnerId: optimizationResult.selectedPartner.id
      });
    }

    logger.info('Optimization completed successfully', {
      requestId,
      partnerId: optimizationResult.selectedPartner.id,
      score: optimizationResult.selectedPartner.score,
      executionTimeMs: executionTime
    });

    const estimatedHours = request.estimated_hours || 20;

    res.json({
      optimizationId: `opt_${Date.now()}`,
      assignmentId: assignment.id,
      selectedPartner: {
        id: optimizationResult.selectedPartner.id,
        name: optimizationResult.selectedPartner.name,
        score: optimizationResult.selectedPartner.score,
        hourlyRate: optimizationResult.selectedPartner.hourly_rate,
        estimatedCost: estimatedHours * optimizationResult.selectedPartner.hourly_rate,
        distance: optimizationResult.selectedPartner.distance
      },
      topCandidates: optimizationResult.topCandidates,
      executionTimeMs: executionTime,
      emailSent: true
    });

  } catch (error) {
    logger.error('Optimization failed', {
      requestId: req.body.requestId,
      error: (error as Error).message,
      executionTimeMs: Date.now() - startTime
    });
    next(error);
  }
});

// GET /api/optimization/results/:requestId - Get optimization results for a request
router.get('/results/:requestId', async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('optimization_results')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /api/optimization/test - Test optimization algorithm with sample data
router.post('/test', async (req: Request<{}, any, TestOptimizationRequest>, res: Response, next: NextFunction) => {
  try {
    const { serviceType = 'occupational_doctor', constraints = {} } = req.body;

    // Create a test request
    const testRequest = {
      id: 999999, // Test ID
      client_name: 'Test Client',
      installation_address: '123 Test St, Athens',
      service_type: serviceType as any,
      employee_count: 50,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      status: 'pending' as const,
      created_at: new Date().toISOString()
    };

    // Get sample partners
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    if (error) throw error;

    const optimizationEngine = new OptimizationEngine();
    const result = await optimizationEngine.optimize(testRequest, partners, constraints);

    res.json({
      message: 'Test optimization completed',
      request: testRequest,
      result,
      partnersEvaluated: partners.length
    });

  } catch (error) {
    next(error);
  }
});

export default router;