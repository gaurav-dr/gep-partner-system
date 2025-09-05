import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from 'react-query';
import { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

// Generic API hook for GET requests
export function useApiQuery<TData = unknown, TError = AxiosError>(
  queryKey: string | string[],
  queryFn: () => Promise<{ data: TData }>,
  options?: Omit<UseQueryOptions<{ data: TData }, TError, TData>, 'queryKey' | 'queryFn'> & {
    errorMessage?: string;
    successMessage?: string;
  }
) {
  const { errorMessage, successMessage, ...queryOptions } = options || {};

  return useQuery({
    queryKey,
    queryFn,
    select: data => data.data,
    onError: (error: TError) => {
      if (errorMessage) {
        toast.error(errorMessage);
      } else if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      }
    },
    onSuccess: data => {
      if (successMessage) {
        toast.success(successMessage);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  } as UseQueryOptions<{ data: TData }, TError, TData>);
}

// Generic API hook for mutations (POST, PUT, DELETE)
export function useApiMutation<TData = unknown, TVariables = unknown, TError = AxiosError>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData }>,
  options?: UseMutationOptions<{ data: TData }, TError, TVariables> & {
    errorMessage?: string;
    successMessage?: string;
    invalidateQueries?: string | string[];
  }
) {
  const queryClient = useQueryClient();
  const { errorMessage, successMessage, invalidateQueries, ...mutationOptions } = options || {};

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (successMessage) {
        toast.success(successMessage);
      }

      // Invalidate queries to refetch data
      if (invalidateQueries) {
        if (typeof invalidateQueries === 'string') {
          queryClient.invalidateQueries(invalidateQueries);
        } else {
          invalidateQueries.forEach(key => queryClient.invalidateQueries(key));
        }
      }

      mutationOptions.onSuccess?.(data, variables, undefined as any);
    },
    onError: (error: TError, variables) => {
      if (errorMessage) {
        toast.error(errorMessage);
      } else if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      }

      mutationOptions.onError?.(error, variables, undefined as any);
    },
    ...mutationOptions,
  });
}

// Hook for optimistic updates
export function useOptimisticMutation<TData = unknown, TVariables = unknown, TError = AxiosError>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData }>,
  options: {
    queryKey: string | string[];
    updateFn: (oldData: any, variables: TVariables) => any;
    errorMessage?: string;
    successMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  const { queryKey, updateFn, errorMessage, successMessage } = options;

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(queryKey);

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (oldData: any) => updateFn(oldData, variables));

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (error: TError, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      if (errorMessage) {
        toast.error(errorMessage);
      } else if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      }
    },
    onSuccess: () => {
      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries(queryKey);
    },
  });
}
