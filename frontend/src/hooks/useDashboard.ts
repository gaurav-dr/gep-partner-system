import { useQuery } from 'react-query';
import { partnersApi, customerRequestsApi, assignmentsApi } from '../services/api';

export interface DashboardStats {
  totalRequests: number;
  activePartners: number;
  pendingAssignments: number;
  completedThisMonth: number;
}

const calculateStats = (partners: any[], requests: any[], assignments: any[]): DashboardStats => {
  const activePartners = Array.isArray(partners) ? partners.filter(p => p.is_active).length : 0;
  const totalRequests = Array.isArray(requests) ? requests.length : 0;
  
  console.log('🔍 calculateStats - assignments input:', assignments);
  const pendingAssignments = Array.isArray(assignments)
    ? assignments.filter(a => a.status === 'proposed' || a.status === 'pending').length
    : 0;
  console.log('📊 Calculated pending assignments:', pendingAssignments);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const completedThisMonth = Array.isArray(assignments)
    ? assignments.filter(a => {
        if (a.status !== 'completed' || !a.completed_at) return false;
        const completedDate = new Date(a.completed_at);
        return (
          completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear
        );
      }).length
    : 0;

  return {
    totalRequests,
    activePartners,
    pendingAssignments,
    completedThisMonth,
  };
};

export const useDashboardStats = () => {
  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnersApi.getAll({ limit: 1000 }).then(res => res.data.data),
    staleTime: 0, // No cache for debugging
  });

  const requestsQuery = useQuery({
    queryKey: ['customer-requests'],
    queryFn: () => customerRequestsApi.getAll({ limit: 1000 }).then(res => res.data.data),
    staleTime: 0, // No cache for debugging
  });

  const assignmentsQuery = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.getAll({ limit: 1000 }).then(res => res.data.data),
    staleTime: 0, // No cache for debugging
  });

  const isLoading =
    partnersQuery.isLoading || requestsQuery.isLoading || assignmentsQuery.isLoading;
  const isError = partnersQuery.isError || requestsQuery.isError || assignmentsQuery.isError;
  const error = partnersQuery.error || requestsQuery.error || assignmentsQuery.error;

  console.log('🔍 Dashboard data:', {
    partners: partnersQuery.data?.length || 0,
    requests: requestsQuery.data?.length || 0, 
    assignments: assignmentsQuery.data?.length || 0,
    assignmentsData: assignmentsQuery.data
  });

  const stats = calculateStats(
    partnersQuery.data || [],
    requestsQuery.data || [],
    assignmentsQuery.data || []
  );

  return {
    stats,
    isLoading,
    isError,
    error,
    refetch: () => {
      partnersQuery.refetch();
      requestsQuery.refetch();
      assignmentsQuery.refetch();
    },
  };
};
