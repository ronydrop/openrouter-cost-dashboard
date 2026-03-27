import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { DashboardHeader, SummaryCards, SpendOverTimeChart, SpendByModelChart, InsightCard, ModelCostTable, SyncButton } from './components';
import { useDashboardSummary, useTimeSeries, useModelMetrics, useInsights, useSyncData } from './hooks/useDashboard';
import type { DateRange } from './types';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

function Dashboard() {
  const queryClientContext = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<DateRange>('last30days');
  const [customDateRange, setCustomDateRange] = useState({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() });
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  const rangeToUse = selectedRange === 'custom' ? customDateRange.start + ',' + customDateRange.end : selectedRange;

  const { data: summaryResponse, isLoading: summaryLoading } = useDashboardSummary(rangeToUse);
  const { data: timeSeriesResponse, isLoading: timeSeriesLoading } = useTimeSeries(rangeToUse);
  const { data: modelMetricsResponse, isLoading: modelMetricsLoading } = useModelMetrics(rangeToUse);
  const { data: insightsResponse, isLoading: insightsLoading } = useInsights(rangeToUse);

  const summary = summaryResponse?.data;
  const timeSeries = timeSeriesResponse?.data;
  const modelMetrics = modelMetricsResponse?.data;
  const insights = insightsResponse?.data;
  const syncMutation = useSyncData();

  const handleSync = async () => {
    setSyncError(null);
    try {
      const result = await syncMutation.mutateAsync(selectedRange === 'custom' ? customDateRange.start.split('T')[0] + ',' + customDateRange.end.split('T')[0] : selectedRange);
      if (!result.success) setSyncError(result.message);
      else setHasData(result.records_synced > 0);
    } catch (error: any) { setSyncError(error.message || 'Sync failed'); }
  };

  const handleRefresh = () => queryClientContext.invalidateQueries();
  const handleRangeChange = (range: DateRange) => { setSelectedRange(range); if (range !== 'custom') { const d = getDates(range); setCustomDateRange(d); }};

  const getDates = (range: DateRange) => {
    const t = new Date();
    switch (range) {
      case 'today': return { start: new Date(t.setHours(0,0,0,0)).toISOString(), end: new Date().toISOString() };
      case 'yesterday': const y = new Date(t); y.setDate(y.getDate()-1); return { start: new Date(y.setHours(0,0,0,0)).toISOString(), end: new Date(y.setHours(23,59,59,999)).toISOString() };
      case 'last7days': return { start: new Date(Date.now() - 7*24*60*60*1000).toISOString(), end: new Date().toISOString() };
      case 'last30days': return { start: new Date(Date.now() - 30*24*60*60*1000).toISOString(), end: new Date().toISOString() };
      case 'last90days': return { start: new Date(Date.now() - 90*24*60*60*1000).toISOString(), end: new Date().toISOString() };
      case 'currentMonth': return { start: new Date(t.getFullYear(), t.getMonth(), 1).toISOString(), end: new Date().toISOString() };
      case 'previousMonth': return { start: new Date(t.getFullYear(), t.getMonth()-1, 1).toISOString(), end: new Date(t.getFullYear(), t.getMonth(), 0).toISOString() };
      default: return { start: new Date(Date.now() - 30*24*60*60*1000).toISOString(), end: new Date().toISOString() };
    }
  };

  const isRefreshing = summaryLoading || timeSeriesLoading || modelMetricsLoading || insightsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader selectedRange={selectedRange} onRangeChange={handleRangeChange} customDateRange={customDateRange} onCustomDateRangeChange={setCustomDateRange} currency={currency} onCurrencyChange={setCurrency} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-6"><SyncButton onSync={handleSync} isSyncing={syncMutation.isPending} hasData={hasData} error={syncError} /></section>
        <section className="mb-8"><SummaryCards data={summary} loading={summaryLoading} /></section>
        <section className="mb-8"><SpendOverTimeChart data={timeSeries} loading={timeSeriesLoading} currency={currency} /></section>
        <section className="mb-8"><SpendByModelChart data={modelMetrics} loading={modelMetricsLoading} currency={currency} /></section>
        <section className="mb-8"><InsightCard insights={insights} loading={insightsLoading} /></section>
        <section className="mb-8"><h2 className="text-xl font-bold text-gray-900 mb-4">Detalhes por Modelo</h2><ModelCostTable data={modelMetrics} loading={modelMetricsLoading} /></section>
        <footer className="text-center text-sm text-gray-500 py-8 border-t border-gray-200">
          <p>OpenRouter Cost Dashboard - Analise seus gastos com IA</p>
          <p className="mt-1">Cotacao USD/BRL: R$ {summary?.exchangeRate.toFixed(4) || '5.00'} ({summary?.exchangeRateSource || 'Automatica'})</p>
        </footer>
      </main>
    </div>
  );
}

function App() { return (<QueryClientProvider client={queryClient}><Dashboard /></QueryClientProvider>); }
export default App;
