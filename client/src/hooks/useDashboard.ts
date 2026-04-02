import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { CurrencyInfo } from '../types';

export const useSyncData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (range: string) => apiService.syncData(range),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['timeSeries'] });
      queryClient.invalidateQueries({ queryKey: ['modelMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['providerMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['apiKeyMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['apiKeyTimeSeries'] });
      queryClient.invalidateQueries({ queryKey: ['hourlyMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['tokenMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
};

export const useCredits = () => useQuery({ queryKey: ['credits'], queryFn: () => apiService.getCredits(), staleTime: 5 * 60 * 1000, retry: 1 });

export const useExchangeRate = () => useQuery({ queryKey: ['exchangeRate'], queryFn: () => apiService.getExchangeRate(), staleTime: 10 * 60 * 1000, retry: 1 });

export const useUpdateExchangeRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rate: number) => apiService.updateExchangeRate(rate),
    onSuccess: (data: CurrencyInfo) => {
      queryClient.setQueryData(['exchangeRate'], data);
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['timeSeries'] });
      queryClient.invalidateQueries({ queryKey: ['modelMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
};

export const useDashboardSummary = (range: string) => useQuery({ 
  queryKey: ['dashboardSummary', range], 
  queryFn: () => apiService.getDashboardSummary(range), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useTimeSeries = (range: string, granularity?: string) => useQuery({ 
  queryKey: ['timeSeries', range, granularity], 
  queryFn: () => apiService.getTimeSeries(range, granularity), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useModelMetrics = (range: string) => useQuery({ 
  queryKey: ['modelMetrics', range], 
  queryFn: () => apiService.getModelMetrics(range), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useProviderMetrics = (range: string) => useQuery({ 
  queryKey: ['providerMetrics', range], 
  queryFn: () => apiService.getProviderMetrics(range), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useApiKeyMetrics = (range: string) => useQuery({ 
  queryKey: ['apiKeyMetrics', range], 
  queryFn: () => apiService.getApiKeyMetrics(range), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useApiKeyTimeSeries = (range: string) => useQuery({
  queryKey: ['apiKeyTimeSeries', range],
  queryFn: () => apiService.getApiKeyTimeSeries(range),
  staleTime: 2 * 60 * 1000,
  retry: 1
});

export const useHourlyMetrics = (range: string) => useQuery({ 
  queryKey: ['hourlyMetrics', range], 
  queryFn: () => apiService.getHourlyMetrics(range), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useTokenMetrics = (range: string) => useQuery({ 
  queryKey: ['tokenMetrics', range], 
  queryFn: () => apiService.getTokenMetrics(range), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useExtendedDashboard = (range: string) => useQuery({ 
  queryKey: ['extendedDashboard', range], 
  queryFn: () => apiService.getExtendedDashboard(range), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useInsights = (range: string) => useQuery({ 
  queryKey: ['insights', range], 
  queryFn: () => apiService.getInsights(range), 
  staleTime: 2 * 60 * 1000, 
  retry: 1 
});

export const useClearCache = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.clearCache(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useHealthCheck = () => useQuery({ 
  queryKey: ['health'], 
  queryFn: () => apiService.healthCheck(), 
  staleTime: 30 * 1000, 
  refetchInterval: 60 * 1000, 
  retry: 1 
});
