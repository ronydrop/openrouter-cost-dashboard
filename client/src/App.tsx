import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  DashboardHeader,
  SummaryCards,
  SpendOverTimeChart,
  SpendByModelChart,
  InsightCard,
  ModelCostTable,
} from './components';
import {
  useDashboardSummary,
  useTimeSeries,
  useModelMetrics,
  useInsights,
} from './hooks/useDashboard';
import type { DateRange } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Dashboard() {
  const queryClientContext = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<DateRange>('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  });
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');

  const rangeToUse = selectedRange === 'custom' 
    ? `${customDateRange.start},${customDateRange.end}`
    : selectedRange;

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(rangeToUse);
  const { data: timeSeries, isLoading: timeSeriesLoading } = useTimeSeries(rangeToUse);
  const { data: modelMetrics, isLoading: modelMetricsLoading } = useModelMetrics(rangeToUse);
  const { data: insights, isLoading: insightsLoading } = useInsights(rangeToUse);

  const handleRefresh = () => {
    queryClientContext.invalidateQueries();
  };

  const handleRangeChange = (range: DateRange) => {
    setSelectedRange(range);
    if (range !== 'custom') {
      const dates = getDateRangeForFilter(range);
      setCustomDateRange(dates);
    }
  };

  const getDateRangeForFilter = (range: DateRange): { start: string; end: string } => {
    const today = new Date();
    switch (range) {
      case 'today':
        return { start: new Date(today.setHours(0,0,0,0)).toISOString(), end: new Date().toISOString() };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: new Date(yesterday.setHours(0,0,0,0)).toISOString(), end: new Date(yesterday.setHours(23,59,59,999)).toISOString() };
      case 'last7days':
        return { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() };
      case 'last30days':
        return { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() };
      case 'currentMonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: startOfMonth.toISOString(), end: new Date().toISOString() };
      case 'previousMonth':
        const startPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: startPrevMonth.toISOString(), end: endPrevMonth.toISOString() };
      default:
        return { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() };
    }
  };

  const isRefreshing = summaryLoading || timeSeriesLoading || modelMetricsLoading || insightsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
        currency={currency}
        onCurrencyChange={setCurrency}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards - Removido "Cotação USD/BRL" para evitar duplicação */}
        <section className="mb-8">
          <SummaryCards data={summary} loading={summaryLoading} />
        </section>

        {/* Gráfico Principal */}
        <section className="mb-8">
          <SpendOverTimeChart data={timeSeries} loading={timeSeriesLoading} currency={currency} />
        </section>

        {/* Gráficos por Modelo */}
        <section className="mb-8">
          <SpendByModelChart data={modelMetrics} loading={modelMetricsLoading} currency={currency} />
        </section>

        {/* Insights */}
        <section className="mb-8">
          <InsightCard insights={insights} loading={insightsLoading} />
        </section>

        {/* Tabela de Detalhes */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Detalhes por Modelo</h2>
          <ModelCostTable data={modelMetrics} loading={modelMetricsLoading} />
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 py-8 border-t border-gray-200">
          <p>OpenRouter Cost Dashboard - Analise seus gastos com IA</p>
          <p className="mt-1">Cotação USD/BRL: R$ {summary?.exchangeRate.toFixed(4) || '5.00'} ({summary?.exchangeRateSource || 'Automática'})</p>
        </footer>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
