import express, { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { Logger } from '../types';

const logger: Logger = require('../utils/logger');
const router = express.Router();

interface UtilizationQuery {
  start_date?: string;
  end_date?: string;
}

interface StatusCounts {
  [status: string]: number;
}

interface UtilizationData {
  [partnerId: string]: {
    partner_id: string;
    partner_name: string;
    max_hours_per_week: number;
    assigned_hours: number;
    completed_hours: number;
    utilization_rate: number;
    assignment_count: number;
  };
}

// GET /api/analytics/dashboard - Get dashboard statistics
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get total requests count
    const { count: totalRequests } = await supabase
      .from('customer_requests')
      .select('*', { count: 'exact', head: true });

    // Get active partners count
    const { count: activePartners } = await supabase
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get pending assignments count
    const { count: pendingAssignments } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'proposed');

    // Get completed assignments this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: completedThisMonth } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', startOfMonth.toISOString());

    // Get request status distribution
    const { data: statusDistribution } = await supabase
      .from('customer_requests')
      .select('status')
      .order('status');

    // Calculate status counts
    const statusCounts: StatusCounts = statusDistribution?.reduce((acc: StatusCounts, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const dashboardData = {
      totalRequests: totalRequests || 0,
      activePartners: activePartners || 0,
      pendingAssignments: pendingAssignments || 0,
      completedThisMonth: completedThisMonth || 0,
      statusDistribution: statusCounts,
      lastUpdated: new Date().toISOString()
    };

    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/utilization - Get partner utilization data
router.get('/utilization', async (req: Request<{}, any, any, UtilizationQuery>, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('assignments')
      .select(`
        partner_id,
        assigned_hours,
        status,
        partners (
          name,
          max_hours_per_week
        )
      `);

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate utilization by partner
    const utilizationData: UtilizationData = data?.reduce((acc: UtilizationData, assignment: any) => {
      const partnerId = assignment.partner_id;
      if (!acc[partnerId]) {
        acc[partnerId] = {
          partner_id: partnerId,
          partner_name: assignment.partners.name,
          max_hours_per_week: assignment.partners.max_hours_per_week,
          assigned_hours: 0,
          completed_hours: 0,
          utilization_rate: 0,
          assignment_count: 0
        };
      }

      acc[partnerId].assigned_hours += assignment.assigned_hours;
      acc[partnerId].assignment_count += 1;

      if (assignment.status === 'completed') {
        acc[partnerId].completed_hours += assignment.assigned_hours;
      }

      return acc;
    }, {}) || {};

    // Calculate utilization rates
    Object.values(utilizationData).forEach(partner => {
      partner.utilization_rate = partner.max_hours_per_week > 0 
        ? (partner.assigned_hours / partner.max_hours_per_week) * 100 
        : 0;
    });

    res.json({
      data: Object.values(utilizationData),
      summary: {
        total_partners: Object.keys(utilizationData).length,
        avg_utilization: Object.values(utilizationData).length > 0 
          ? Object.values(utilizationData).reduce((sum, p) => sum + p.utilization_rate, 0) / Object.values(utilizationData).length
          : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/performance - Get performance metrics
router.get('/performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get optimization performance data
    const { data: optimizationResults } = await supabase
      .from('optimization_results')
      .select(`
        execution_time_ms,
        algorithm,
        success,
        created_at,
        partner_count,
        request_count
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate performance metrics
    const successfulRuns = optimizationResults?.filter(r => r.success) || [];
    const failedRuns = optimizationResults?.filter(r => !r.success) || [];

    const performanceMetrics = {
      total_optimizations: optimizationResults?.length || 0,
      success_rate: optimizationResults?.length ? (successfulRuns.length / optimizationResults.length) * 100 : 0,
      avg_execution_time: successfulRuns.length ? 
        successfulRuns.reduce((sum, r) => sum + r.execution_time_ms, 0) / successfulRuns.length : 0,
      algorithm_performance: {} as Record<string, any>
    };

    // Group by algorithm
    const algorithmGroups = successfulRuns.reduce((acc: Record<string, any[]>, result) => {
      if (!acc[result.algorithm]) {
        acc[result.algorithm] = [];
      }
      acc[result.algorithm].push(result);
      return acc;
    }, {});

    // Calculate per-algorithm metrics
    Object.keys(algorithmGroups).forEach(algorithm => {
      const runs = algorithmGroups[algorithm];
      performanceMetrics.algorithm_performance[algorithm] = {
        total_runs: runs.length,
        avg_execution_time: runs.reduce((sum, r) => sum + r.execution_time_ms, 0) / runs.length,
        avg_partner_count: runs.reduce((sum, r) => sum + (r.partner_count || 0), 0) / runs.length,
        avg_request_count: runs.reduce((sum, r) => sum + (r.request_count || 0), 0) / runs.length
      };
    });

    res.json({
      metrics: performanceMetrics,
      recent_runs: optimizationResults?.slice(0, 10) || []
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/trends - Get trend data
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get daily request counts for the last 30 days
    const { data: dailyRequests } = await supabase
      .from('customer_requests')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at');

    // Get daily assignment counts
    const { data: dailyAssignments } = await supabase
      .from('assignments')
      .select('created_at, status')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at');

    // Group by date
    const requestsByDate = dailyRequests?.reduce((acc: Record<string, number>, req) => {
      const date = new Date(req.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    const assignmentsByDate = dailyAssignments?.reduce((acc: Record<string, any>, assignment) => {
      const date = new Date(assignment.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0, pending: 0 };
      }
      acc[date].total += 1;
      if (assignment.status === 'completed') {
        acc[date].completed += 1;
      } else if (assignment.status === 'proposed') {
        acc[date].pending += 1;
      }
      return acc;
    }, {}) || {};

    res.json({
      requests_trend: requestsByDate,
      assignments_trend: assignmentsByDate,
      period: {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;