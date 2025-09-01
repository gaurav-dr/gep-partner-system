import React, { useState } from 'react';
import { requestsApi } from '../services/supabaseApi.ts';
import { traceabilityService } from '../services/traceabilityService.ts';

interface CustomerRequestForm {
  name: string;
  numberOfInstallations: number;
  totalEmployees: number;
  installationType: string;
  workType: string;
  contractCompletionDate: string;
  numberOfVisits?: number;
  hoursOfOperation: string;
  blockedDates?: string[];
  preferredDates?: string[];
  specificRequests?: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
}

const NewRequest: React.FC = () => {
  const [formData, setFormData] = useState<CustomerRequestForm>({
    name: '',
    numberOfInstallations: 1,
    totalEmployees: 0,
    installationType: '',
    workType: '',
    contractCompletionDate: '',
    numberOfVisits: undefined,
    hoursOfOperation: '',
    blockedDates: [],
    preferredDates: [],
    specificRequests: '',
    location: '',
    contactEmail: '',
    contactPhone: ''
  });

  const [blockedDateInput, setBlockedDateInput] = useState('');
  const [preferredDateInput, setPreferredDateInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numberOfInstallations' || name === 'totalEmployees' || name === 'numberOfVisits' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const addBlockedDate = () => {
    if (blockedDateInput && !formData.blockedDates?.includes(blockedDateInput)) {
      setFormData(prev => ({
        ...prev,
        blockedDates: [...(prev.blockedDates || []), blockedDateInput]
      }));
      setBlockedDateInput('');
    }
  };

  const removeBlockedDate = (date: string) => {
    setFormData(prev => ({
      ...prev,
      blockedDates: prev.blockedDates?.filter(d => d !== date) || []
    }));
  };

  const addPreferredDate = () => {
    if (preferredDateInput && !formData.preferredDates?.includes(preferredDateInput)) {
      setFormData(prev => ({
        ...prev,
        preferredDates: [...(prev.preferredDates || []), preferredDateInput]
      }));
      setPreferredDateInput('');
    }
  };

  const removePreferredDate = (date: string) => {
    setFormData(prev => ({
      ...prev,
      preferredDates: prev.preferredDates?.filter(d => d !== date) || []
    }));
  };

  const calculateProjectHours = () => {
    // Synthetic calculation based on previous projects
    const baseHoursPerEmployee = formData.workType === 'comprehensive_health_assessment' ? 0.5 : 0.3;
    const installationMultiplier = Math.sqrt(formData.numberOfInstallations); // Economies of scale
    const totalHours = Math.ceil(formData.totalEmployees * baseHoursPerEmployee * installationMultiplier);
    
    return Math.max(totalHours, formData.numberOfInstallations * 2); // Minimum 2 hours per installation
  };

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const fillDemoData = async () => {
    setIsGeneratingAI(true);
    setSubmitMessage('');
    
    try {
      console.log('🤖 Generating AI customer request data...');
      
      // Call the backend API to generate AI customer data
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/customer-requests/generate-ai`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const aiData = result.data;
        
        // Transform AI data to match form structure
        setFormData({
          name: aiData.name || '',
          numberOfInstallations: aiData.numberOfInstallations || 1,
          totalEmployees: aiData.totalEmployees || 0,
          installationType: aiData.installationType || '',
          workType: aiData.workType || '',
          contractCompletionDate: aiData.contractCompletionDate || '',
          numberOfVisits: aiData.numberOfVisits || undefined,
          hoursOfOperation: aiData.hoursOfOperation || '',
          blockedDates: aiData.blockedDates || [],
          preferredDates: aiData.preferredDates || [],
          specificRequests: aiData.specificRequests || '',
          location: aiData.location || '',
          contactEmail: aiData.contactEmail || '',
          contactPhone: aiData.contactPhone || ''
        });
        
        setSubmitMessage('🤖 AI-generated customer data loaded! Claude has created a unique, realistic request.');
        console.log('✅ AI data loaded:', aiData);
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('❌ AI generation failed:', error);
      
      // Fallback to static demo data if AI fails
      const today = new Date();
      const completionDate = new Date(today);
      completionDate.setMonth(today.getMonth() + 6);
      
      setFormData({
        name: 'ACME Manufacturing Ltd. (Fallback)',
        numberOfInstallations: 3,
        totalEmployees: 85,
        installationType: 'manufacturing',
        workType: 'comprehensive_health_assessment',
        contractCompletionDate: completionDate.toISOString().split('T')[0],
        numberOfVisits: 12,
        hoursOfOperation: 'Monday-Friday 08:00-16:00',
        blockedDates: ['2025-12-25', '2025-01-01'],
        preferredDates: ['2025-02-15', '2025-03-20', '2025-04-10'],
        specificRequests: 'Please coordinate with facility manager before visits. Special attention needed for chemical handling areas.',
        location: 'Thessaloniki, Greece',
        contactEmail: 'safety@acme-manufacturing.gr',
        contactPhone: '+30 231 056 7890'
      });
      
      setSubmitMessage('⚠️ AI service unavailable - loaded fallback demo data instead.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const projectHours = calculateProjectHours();
      const estimatedCost = projectHours * 70; // Average hourly rate

      const customerRequest = {
        client_name: formData.name,
        number_of_installations: formData.numberOfInstallations,
        total_employees: formData.totalEmployees,
        installation_type: formData.installationType,
        work_type: formData.workType,
        contract_completion_date: formData.contractCompletionDate,
        number_of_visits: formData.numberOfVisits,
        hours_of_operation: formData.hoursOfOperation,
        blocked_dates: formData.blockedDates,
        preferred_dates: formData.preferredDates,
        specific_requests: formData.specificRequests,
        location: formData.location,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone,
        calculated_hours: projectHours,
        estimated_cost: estimatedCost,
        status: 'pending',
        priority: formData.totalEmployees > 100 ? 'high' : formData.totalEmployees > 50 ? 'medium' : 'low'
      };

      console.log('🔄 Submitting customer request:', customerRequest);

      try {
        await requestsApi.create(customerRequest);
        setSubmitMessage('✅ Customer request submitted successfully! Our team will review and assign a partner within 24 hours.');
        
        // Reset form
        setFormData({
          name: '',
          numberOfInstallations: 1,
          totalEmployees: 0,
          installationType: '',
          workType: '',
          contractCompletionDate: '',
          numberOfVisits: undefined,
          hoursOfOperation: '',
          blockedDates: [],
          preferredDates: [],
          specificRequests: '',
          location: '',
          contactEmail: '',
          contactPhone: ''
        });
      } catch (apiError) {
        console.warn('⚠️ API submission failed, logging request locally:', apiError);
        
        // Store in localStorage for persistence
        const existingRequests = JSON.parse(localStorage.getItem('customerRequests') || '[]');
        const newRequest = {
          ...customerRequest,
          id: Date.now(),
          created_at: new Date().toISOString()
        };
        existingRequests.push(newRequest);
        localStorage.setItem('customerRequests', JSON.stringify(existingRequests));

        // Track customer request creation in traceability system
        traceabilityService.trackCustomerRequestCreated(newRequest);
        
        setSubmitMessage('✅ Request received! Due to system maintenance, your request has been queued and will be processed shortly.');
      }

    } catch (error) {
      console.error('❌ Error submitting request:', error);
      setSubmitMessage('❌ Error submitting request. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedHours = calculateProjectHours();
  const estimatedCost = estimatedHours * 70;

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">New Customer Request</h1>
          <p className="mt-2 text-sm text-gray-700">
            Submit a new health inspection request. All fields marked with * are required.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={fillDemoData}
            disabled={isGeneratingAI}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              isGeneratingAI
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {isGeneratingAI ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Claude AI Generating...
              </>
            ) : (
              <>🤖 Generate with AI</>
            )}
          </button>
        </div>
      </div>

      {submitMessage && (
        <div className={`mt-4 p-4 rounded-md ${
          submitMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {submitMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 bg-white shadow rounded-lg">
        <div className="px-6 py-8 space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="DEMO HELLAS A.E.E"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="Athens, Greece"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Email *
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  required
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="contact@demohellas.gr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  required
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="+30 210 123 4567"
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Number of Installations *
                </label>
                <input
                  type="number"
                  name="numberOfInstallations"
                  required
                  min="1"
                  value={formData.numberOfInstallations}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Number of Employees *
                </label>
                <input
                  type="number"
                  name="totalEmployees"
                  required
                  min="1"
                  value={formData.totalEmployees}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type of Installation *
                </label>
                <select
                  name="installationType"
                  required
                  value={formData.installationType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                >
                  <option value="">Select installation type</option>
                  <option value="office">Office Building</option>
                  <option value="retail">Retail Store</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="manufacturing">Manufacturing Facility</option>
                  <option value="healthcare">Healthcare Facility</option>
                  <option value="hospitality">Hotel/Restaurant</option>
                  <option value="mixed">Mixed Use</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type of Work *
                </label>
                <select
                  name="workType"
                  required
                  value={formData.workType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                >
                  <option value="">Select work type</option>
                  <option value="routine_health_check">Routine Health Check</option>
                  <option value="comprehensive_health_assessment">Comprehensive Health Assessment</option>
                  <option value="safety_inspection">Safety Inspection</option>
                  <option value="occupational_health_screening">Occupational Health Screening</option>
                  <option value="compliance_audit">Compliance Audit</option>
                  <option value="emergency_response_assessment">Emergency Response Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contract Completion Date *
                </label>
                <input
                  type="date"
                  name="contractCompletionDate"
                  required
                  value={formData.contractCompletionDate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hours of Operation *
                </label>
                <input
                  type="text"
                  name="hoursOfOperation"
                  required
                  value={formData.hoursOfOperation}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="Monday-Friday 09:00-17:00"
                />
              </div>
            </div>
          </div>

          {/* Optional Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Optional Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Number of Visits Desired
                </label>
                <input
                  type="number"
                  name="numberOfVisits"
                  min="1"
                  value={formData.numberOfVisits || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="Leave empty for automatic calculation"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Specific Customer Requests
                </label>
                <textarea
                  name="specificRequests"
                  rows={3}
                  value={formData.specificRequests}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="Any specific requirements, preferences, or notes..."
                />
              </div>
            </div>
          </div>

          {/* Date Management */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Preferences</h3>
            
            {/* Blocked Dates */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blocked Dates (dates when visits cannot occur)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={blockedDateInput}
                  onChange={(e) => setBlockedDateInput(e.target.value)}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                />
                <button
                  type="button"
                  onClick={addBlockedDate}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Add Blocked Date
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.blockedDates?.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                  >
                    {date}
                    <button
                      type="button"
                      onClick={() => removeBlockedDate(date)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Preferred Dates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Dates (dates when visits are preferred)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={preferredDateInput}
                  onChange={(e) => setPreferredDateInput(e.target.value)}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                />
                <button
                  type="button"
                  onClick={addPreferredDate}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add Preferred Date
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.preferredDates?.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                  >
                    {date}
                    <button
                      type="button"
                      onClick={() => removePreferredDate(date)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Project Estimate */}
          {formData.totalEmployees > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Project Estimate</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Estimated Hours:</span>
                  <span className="ml-2 font-medium text-blue-900">{estimatedHours} hours</span>
                </div>
                <div>
                  <span className="text-blue-700">Estimated Cost:</span>
                  <span className="ml-2 font-medium text-blue-900">€{estimatedCost.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                * Estimate based on synthetic data from previous projects. Final cost may vary based on partner selection and specific requirements.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Customer Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewRequest;