import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { assignmentsApi } from '../services/supabaseApi';
import Calendar from '../components/Calendar';

interface Assignment {
  id: number;
  request_id: number;
  partner_id: string;
  installation_code?: string;
  service_type: 'occupational_doctor' | 'safety_engineer';
  assigned_hours: number;
  hourly_rate: number;
  total_cost: number;
  status: 'proposed' | 'accepted' | 'declined' | 'expired' | 'completed';
  optimization_score?: number;
  travel_distance?: number;
  email_sent_at?: string;
  partner_response?: string;
  partner_responded_at?: string;
  response_deadline?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer_requests?: {
    id: number;
    client_name: string;
    installation_address: string;
    service_type: string;
    start_date?: string;
    end_date?: string;
    status: string;
  };
  partners?: {
    id: string;
    name: string;
    specialty: string;
    city: string;
    hourly_rate: number;
    email: string;
  };
  installations?: {
    installation_code: string;
    description: string;
    address: string;
    clients?: {
      company_name: string;
    };
  };
}

const Assignments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Fetch assignments from API
  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery<Assignment[]>('assignments-page', async () => {
    const realAssignments = await assignmentsApi.getAll();
    return realAssignments || [];
  });

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const partnerName = assignment.partners?.name || '';
    const clientName = assignment.customer_requests?.client_name || '';
    const matchesSearch =
      partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || assignment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed':
        return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'accepted':
        return 'border-blue-500 bg-blue-50 text-blue-800';
      case 'completed':
        return 'border-green-500 bg-green-50 text-green-800';
      case 'declined':
        return 'border-red-500 bg-red-50 text-red-800';
      case 'expired':
        return 'border-gray-500 bg-gray-50 text-gray-800';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-800';
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'occupational_doctor':
        return 'Occupational Doctor';
      case 'safety_engineer':
        return 'Safety Engineer';
      default:
        return type;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error loading assignments: {(error as Error).message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track and manage partner assignments for health inspections
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                view === 'list'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                view === 'calendar'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Calendar View
            </button>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="mt-6">
          <Calendar />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filterStatus || ''}
                onChange={e => setFilterStatus(e.target.value || null)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="proposed">Proposed</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredAssignments.length} of {assignments.length} assignments
          </div>

          {/* Assignments List */}
          <div className="mt-6 space-y-4">
            {filteredAssignments.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-500">No assignments found matching your criteria.</div>
              </div>
            ) : (
              filteredAssignments.map(assignment => (
                <div
                  key={assignment.id}
                  className={`border-l-4 pl-6 py-4 bg-white shadow rounded-lg ${getStatusColor(assignment.status)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {assignment.partners?.name || 'Unknown Partner'} →{' '}
                          {assignment.customer_requests?.client_name || 'Unknown Client'}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            assignment.status === 'proposed'
                              ? 'bg-yellow-100 text-yellow-800'
                              : assignment.status === 'accepted'
                                ? 'bg-blue-100 text-blue-800'
                                : assignment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : assignment.status === 'declined'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Service:</span>{' '}
                          {getServiceTypeLabel(assignment.service_type)}
                        </div>
                        <div>
                          <span className="font-medium">Hours:</span> {assignment.assigned_hours}h
                        </div>
                        <div>
                          <span className="font-medium">Rate:</span> €{assignment.hourly_rate}/hour
                        </div>
                        <div>
                          <span className="font-medium">Total Cost:</span> €{assignment.total_cost}
                        </div>
                        <div>
                          <span className="font-medium">Partner Location:</span>{' '}
                          {assignment.partners?.city || 'N/A'}
                        </div>
                        {assignment.travel_distance && (
                          <div>
                            <span className="font-medium">Distance:</span>{' '}
                            {assignment.travel_distance}km
                          </div>
                        )}
                      </div>

                      {assignment.customer_requests?.installation_address && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Location:</span>{' '}
                          {assignment.customer_requests.installation_address}
                        </div>
                      )}

                      {assignment.customer_requests?.start_date && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Service Period:</span>{' '}
                          {formatDate(assignment.customer_requests.start_date)}
                          {assignment.customer_requests.end_date &&
                            ` - ${formatDate(assignment.customer_requests.end_date)}`}
                        </div>
                      )}

                      {assignment.response_deadline && assignment.status === 'proposed' && (
                        <div className="mt-2 text-sm text-red-600">
                          <span className="font-medium">Response Deadline:</span>{' '}
                          {formatDateTime(assignment.response_deadline)}
                        </div>
                      )}

                      {assignment.notes && (
                        <div className="mt-2 text-sm text-gray-700">
                          <span className="font-medium">Notes:</span> {assignment.notes}
                        </div>
                      )}
                    </div>

                    <div className="ml-6 text-right text-sm text-gray-500">
                      <div>Created: {formatDate(assignment.created_at)}</div>
                      {assignment.email_sent_at && (
                        <div>Email Sent: {formatDate(assignment.email_sent_at)}</div>
                      )}
                      {assignment.partner_responded_at && (
                        <div>Responded: {formatDate(assignment.partner_responded_at)}</div>
                      )}
                      {assignment.optimization_score && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Score: {assignment.optimization_score.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary Statistics */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{assignments.length}</div>
                  <div className="text-sm text-gray-500">Total Assignments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {assignments.filter(a => a.status === 'proposed').length}
                  </div>
                  <div className="text-sm text-gray-500">Proposed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {assignments.filter(a => a.status === 'accepted').length}
                  </div>
                  <div className="text-sm text-gray-500">Accepted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {assignments.filter(a => a.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    €{assignments.reduce((sum, a) => sum + a.total_cost, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Total Value</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Assignments;
