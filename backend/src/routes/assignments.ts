import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { supabaseAdmin } from '../config/supabase';
import { Logger, Assignment } from '../types';

const logger: Logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

interface AssignmentsQuery {
  status?: string;
  partner_id?: string;
  page?: string;
  limit?: string;
}

interface UpdateAssignmentRequest {
  status?: 'proposed' | 'accepted' | 'declined' | 'completed';
  assigned_hours?: number;
  hourly_rate?: number;
  response_deadline?: string;
  completion_notes?: string;
}

// Validation schema for assignment updates
const updateAssignmentSchema = Joi.object({
  status: Joi.string().valid('proposed', 'accepted', 'declined', 'completed'),
  assigned_hours: Joi.number().min(1).max(1000),
  hourly_rate: Joi.number().min(0).max(1000),
  response_deadline: Joi.date().iso(),
  completion_notes: Joi.string().max(1000)
});

// GET /api/assignments - Get all assignments
router.get('/', async (req: Request<{}, any, any, AssignmentsQuery>, res: Response, next: NextFunction) => {
  try {

    const { status, partner_id, page = '1', limit = '20' } = req.query;

    let query = supabaseAdmin
      .from('assignments')
      .select(`
        *,
        partners (
          id,
          name,
          specialty,
          city,
          email
        ),
        customer_requests (
          id,
          client_name,
          service_type,
          installation_address
        )
      `);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (partner_id) {
      query = query.eq('partner_id', partner_id);
    }

    // Apply pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const from = (pageNumber - 1) * limitNumber;
    const to = from + limitNumber - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('assignments')
      .select('*', { count: 'exact', head: true });

    res.json({
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limitNumber)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/assignments/:id - Get specific assignment
router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('assignments')
      .select(`
        *,
        partners (
          id,
          name,
          specialty,
          city,
          email,
          hourly_rate,
          max_hours_per_week
        ),
        customer_requests (
          id,
          client_name,
          service_type,
          installation_address,
          employee_count,
          estimated_hours,
          start_date,
          end_date,
          special_requirements
        ),
        optimization_results (
          id,
          algorithm,
          score,
          execution_time_ms
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/assignments/:id - Update assignment status
router.put('/:id', validateRequest(updateAssignmentSchema), async (req: Request<{ id: string }, Assignment, UpdateAssignmentRequest>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = { 
      ...req.body, 
      updated_at: new Date().toISOString() 
    };

    const { data, error } = await supabaseAdmin
      .from('assignments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        partners (
          id,
          name,
          email
        ),
        customer_requests (
          id,
          client_name,
          service_type
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }
      throw error;
    }

    logger.info('Assignment updated', {
      assignmentId: data.id,
      partnerId: data.partner_id,
      newStatus: data.status,
      updatedFields: Object.keys(req.body)
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/assignments/:id - Delete assignment
router.delete('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info('Assignment deleted', { assignmentId: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;