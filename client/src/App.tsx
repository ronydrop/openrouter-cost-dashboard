import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { DashboardHeader, SummaryCards, SpendOverTimeChart, SpendByModelChart, InsightCard, ModelCostTable, SyncButton } from './components';
import { useDashboardSummary, useTimeSeries, useModelMetrics, useInsights, useSyncData, useProviderMetrics, useApiKeyMetrics, useTokenMetrics } from './hooks/useDashboard';
import { apiService } from './services/api';
import type { DateRange } from './types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

function Dashboard() {
  const queryClientContext = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<DateRange>('last30days');
  const [customDateRange, setCustomDateRange] = useState({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  const rangeToUse = selectedRange === 'custom' ? customDateRange.start + ',' + customDateRange.end : selectedRange;

  const { data: summaryResponse, isLoading: summaryLoading } = useDashboardSummary(rangeToUse);
  const { data: timeSeriesResponse, isLoading: timeSeriesLoading } = useTimeSeries(rangeToUse);
  const { data: modelMetricsResponse, isLoading: modelMetricsLoading } = useModelMetrics(rangeToUse);
  const { data: insightsResponse, isLoading: insightsLoading } = useInsights(rangeToUse);
  const { data: providerMetricsResponse, isLoading: providerLoading } = useProviderMetrics(rangeToUse);
  const { data: apiKeyMetricsResponse, isLoading: apiKeyLoading } = useApiKeyMetrics(rangeToUse);
  const { data: tokenMetricsResponse } = useTokenMetrics(rangeToUse);

  const summary = summaryResponse?.data;
  const timeSeries = timeSeriesResponse?.data;
  const modelMetrics = modelMetricsResponse?.data;
  const insights = insightsResponse?.data;
  const providerMetrics = providerMetricsResponse?.data;
  const apiKeyMetrics = apiKeyMetricsResponse?.data;
  const tokenMetrics = tokenMetricsResponse?.data;
  const syncMutation = useSyncData();

  useEffect(() => {
    apiService.getDashboardStatus().then((status) => {
      setHasData(status.hasData);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (summary && summary.totalRequests > 0) {
      setHasData(true);
    }
  }, [summary]);

  const handleSync = async () => {
    setSyncError(null);
    try {
      const result = await syncMutation.mutateAsync(selectedRange === 'custom' ? customDateRange.start.split('T')[0] + ',' + customDateRange.end.split('T')[0] : selectedRange);
      if (!result.success) setSyncError(result.message);
      else setHasData(result.records_synced > 0);
    } catch (error: any) { setSyncError(error.message || 'Sync failed'); }
  };

  const handleRefresh = () => queryClientContext.invalidateQueries();
  const handleRangeChange = (range: DateRange) => { 
    setSelectedRange(range); 
    if (range !== 'custom') { 
      const d = getDates(range); 
      setCustomDateRange(d); 
    }
  };

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

  // Provider chart data
  const providerChartData = providerMetrics?.map((p, i) => ({
    name: p.provider,
    value: p.totalCostUsd,
    valueBrl: p.totalCostBrl,
    percent: p.percentOfTotal * 100,
    color: COLORS[i % COLORS.length],
  })) || [];

  // API Key chart data
  const apiKeyChartData = apiKeyMetrics?.map((k, i) => ({
    name: k.api_key_name,
    value: k.totalCostUsd,
    valueBrl: k.totalCostBrl,
    percent: k.percentOfTotal * 100,
    color: COLORS[i % COLORS.length],
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader selectedRange={selectedRange} onRangeChange={handleRangeChange} customDateRange={customDateRange} onCustomDateRangeChange={setCustomDateRange} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-6"><SyncButton onSync={handleSync} isSyncing={syncMutation.isPending} hasData={hasData} error={syncError} /></section>
        <section className="mb-8"><SummaryCards data={summary} loading={summaryLoading} /></section>
        <section className="mb-8"><SpendOverTimeChart data={timeSeries} loading={timeSeriesLoading} /></section>
        
        {/* Provider Chart */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gastos por Fornecedor</h3>
            {providerLoading ? (
              <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
            ) : providerChartData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={providerChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} (${percent.toFixed(1)}%)`}>
                        {providerChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, _name: string, props: { payload?: { valueBrl?: number } }) => {
                        const brl = props.payload?.valueBrl ?? value;
                        return [`$ ${value.toFixed(2)} (R$ ${brl.toFixed(2)})`, 'Custo'];
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={providerChartData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `$ ${v.toFixed(2)}`} />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip formatter={(value: number, _name: string, props: { payload?: { valueBrl?: number } }) => {
                        const brl = props.payload?.valueBrl ?? value;
                        return [`$ ${value.toFixed(2)} (R$ ${brl.toFixed(2)})`, 'Custo'];
                      }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {providerChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">Sem dados disponíveis</div>
            )}
          </div>
        </section>

        {/* API Key Chart */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gastos por API Key</h3>
            {apiKeyLoading ? (
              <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
            ) : apiKeyChartData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={apiKeyChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} (${percent.toFixed(1)}%)`}>
                        {apiKeyChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, _name: string, props: { payload?: { valueBrl?: number } }) => {
                        const brl = props.payload?.valueBrl ?? value;
                        return [`$ ${value.toFixed(2)} (R$ ${brl.toFixed(2)})`, 'Custo'];
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={apiKeyChartData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `$ ${v.toFixed(2)}`} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip formatter={(value: number, _name: string, props: { payload?: { valueBrl?: number } }) => {
                        const brl = props.payload?.valueBrl ?? value;
                        return [`$ ${value.toFixed(2)} (R$ ${brl.toFixed(2)})`, 'Custo'];
                      }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {apiKeyChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">Sem dados disponíveis</div>
            )}
          </div>
        </section>

        {/* Token Metrics */}
        {tokenMetrics && tokenMetrics.totalTokens > 0 && (
          <section className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Tokens</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Prompt Tokens</p>
                  <p className="text-xl font-bold text-blue-900">{tokenMetrics.totalPromptTokens.toLocaleString()}</p>
                  <p className="text-xs text-blue-500">{tokenMetrics.promptPercent.toFixed(1)}%</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Completion Tokens</p>
                  <p className="text-xl font-bold text-green-900">{tokenMetrics.totalCompletionTokens.toLocaleString()}</p>
                  <p className="text-xs text-green-500">{tokenMetrics.completionPercent.toFixed(1)}%</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600">Reasoning Tokens</p>
                  <p className="text-xl font-bold text-purple-900">{tokenMetrics.totalReasoningTokens.toLocaleString()}</p>
                  <p className="text-xs text-purple-500">Chain-of-thought</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-600">Cached Tokens</p>
                  <p className="text-xl font-bold text-amber-900">{tokenMetrics.totalCachedTokens.toLocaleString()}</p>
                  <p className="text-xs text-amber-500">{tokenMetrics.cachedPercent.toFixed(1)}% reutilizados</p>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <p className="text-sm text-gray-600 mr-2">Total:</p>
                <p className="text-lg font-bold text-gray-900">{tokenMetrics.totalTokens.toLocaleString()} tokens</p>
              </div>
            </div>
          </section>
        )}

        {/* Model Chart */}
        <section className="mb-8"><SpendByModelChart data={modelMetrics} loading={modelMetricsLoading} /></section>
        <section className="mb-8"><InsightCard insights={insights} loading={insightsLoading} /></section>
        <section className="mb-8"><h2 className="text-xl font-bold text-gray-900 mb-4">Detalhes por Modelo</h2><ModelCostTable data={modelMetrics} loading={modelMetricsLoading} /></section>
        
        <footer className="text-center text-sm text-gray-500 py-8 border-t border-gray-200">
          <p>OpenRouter Cost Dashboard - Análise seus gastos com IA</p>
          <p className="mt-1">Cotação USD/BRL: R$ {summary?.exchangeRate.toFixed(4) || '5.00'} ({summary?.exchangeRateSource || 'Automática'})</p>
        </footer>
      </main>
    </div>
  );
}

function App() { return (<QueryClientProvider client={queryClient}><Dashboard /></QueryClientProvider>); }
export default App;
