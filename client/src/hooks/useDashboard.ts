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

export const useDashboardSummary = (range: string) => useQuery({ queryKey: ['dashboardSummary', range], queryFn: () => apiService.getDashboardSummary(range), staleTime: 2 * 60 * 1000, retry: 1 });

export const useTimeSeries = (range: string, granularity?: string) => useQuery({ queryKey: ['timeSeries', range, granularity], queryFn: () => apiService.getTimeSeries(range, granularity), staleTime: 2 * 60 * 1000, retry: 1 });

export const useModelMetrics = (range: string) => useQuery({ queryKey: ['modelMetrics', range], queryFn: () => apiService.getModelMetrics(range), staleTime: 2 * 60 * 1000, retry: 1 });

export const useInsights = (range: string) => useQuery({ queryKey: ['insights', range], queryFn: () => apiService.getInsights(range), staleTime: 2 * 60 * 1000, retry: 1 });

export const useHealthCheck = () => useQuery({ queryKey: ['health'], queryFn: () => apiService.healthCheck(), staleTime: 30 * 1000, refetchInterval: 60 * 1000, retry: 1 });
