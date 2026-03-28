import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardHeader, SummaryCards, SpendOverTimeChart, SpendByModelChart, InsightCard, ModelCostTable, SyncButton } from './components';
import { useDashboardSummary, useTimeSeries, useModelMetrics, useInsights, useSyncData, useProviderMetrics, useApiKeyMetrics, useTokenMetrics } from './hooks/useDashboard';
import { useAutoSync } from './hooks/useAutoSync';
import { apiService } from './services/api';
import type { DateRange } from './types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function Dashboard() {
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

  const { lastSyncAt, nextSyncAt, isSyncing: isAutoSyncing, isInitialSync, autoSyncEnabled, toggleAutoSync, triggerSync } = useAutoSync(rangeToUse, {
    onSyncComplete: (success, recordsSynced) => {
      if (success) {
        setHasData(recordsSynced !== undefined && recordsSynced > 0);
      }
    },
    onSyncError: (error) => {
      setSyncError(error);
    },
  });

  const isAnySyncing = syncMutation.isPending || isAutoSyncing;

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
      await triggerSync();
    } catch (error: any) { setSyncError(error.message || 'Sync failed'); }
  };

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

  const providerChartData = providerMetrics?.map((p, i) => ({
    name: p.provider,
    value: p.totalCostUsd,
    valueBrl: p.totalCostBrl,
    percent: p.percentOfTotal * 100,
    color: COLORS[i % COLORS.length],
  })) || [];

  const apiKeyChartData = apiKeyMetrics?.map((k, i) => ({
    name: k.api_key_name,
    value: k.totalCostUsd,
    valueBrl: k.totalCostBrl,
    percent: k.percentOfTotal * 100,
    color: COLORS[i % COLORS.length],
  })) || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="mb-8">
          <SyncButton 
            onSync={handleSync} 
            isSyncing={isAnySyncing} 
            hasData={hasData} 
            error={syncError} 
            lastSync={lastSyncAt}
            nextSync={nextSyncAt}
            isInitialSync={isInitialSync}
            autoSyncEnabled={autoSyncEnabled}
            onToggleAutoSync={toggleAutoSync}
            selectedRange={selectedRange} 
            onRangeChange={handleRangeChange} 
            customDateRange={customDateRange} 
            onCustomDateRangeChange={setCustomDateRange} 
          />
        </section>
        
        <section className="mb-8">
          <SummaryCards data={summary} loading={summaryLoading} />
        </section>
        
        <section className="mb-8">
          <SpendOverTimeChart data={timeSeries} loading={timeSeriesLoading} />
        </section>
        
        <section className="mb-8">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Gastos por Fornecedor</h3>
            </div>
            {providerLoading ? (
              <div className="h-64 bg-[#1c1c1e] animate-pulse rounded-xl"></div>
            ) : providerChartData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={providerChartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={90} 
                        paddingAngle={3} 
                        dataKey="value"
                        stroke="none"
                      >
                        {providerChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1c1c1e',
                          border: '1px solid #3a3a3a',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
                          color: '#ffffff'
                        }}
                        itemStyle={{
                          color: '#a3a3a3',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                        formatter={(value: number, _name: string, props: { payload?: { valueBrl?: number; name?: string } }) => {
                          const brl = props.payload?.valueBrl ?? value;
                          const name = props.payload?.name ?? '';
                          return [
                            <div>
                              <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '4px' }}>
                                ${value.toFixed(2)}
                              </div>
                              <div style={{ color: '#a3a3a3', fontSize: '12px' }}>
                                R$ {brl.toFixed(2)}
                              </div>
                            </div>,
                            name
                          ];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={providerChartData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `$ ${v.toFixed(0)}`} stroke="#525252" fontSize={11} />
                      <YAxis type="category" dataKey="name" width={100} stroke="#a3a3a3" fontSize={12} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1c1c1e',
                          border: '1px solid #3a3a3a',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
                          color: '#ffffff'
                        }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        formatter={(value: number, _name: string, props: { payload?: { valueBrl?: number } }) => {
                          const brl = props.payload?.valueBrl ?? value;
                          return [
                            <div>
                              <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '4px' }}>
                                ${value.toFixed(2)}
                              </div>
                              <div style={{ color: '#a3a3a3', fontSize: '12px' }}>
                                R$ {brl.toFixed(2)}
                              </div>
                            </div>,
                            'Custo'
                          ];
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
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

        <section className="mb-8">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Gastos por API Key</h3>
            </div>
            {apiKeyLoading ? (
              <div className="h-64 bg-[#1c1c1e] animate-pulse rounded-xl"></div>
            ) : apiKeyChartData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={apiKeyChartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={90} 
                        paddingAngle={3} 
                        dataKey="value"
                        stroke="none"
                      >
                        {apiKeyChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1c1c1e', 
                          border: '1px solid #2a2a2a', 
                          borderRadius: '8px',
                          color: '#e5e5e5'
                        }}
                        formatter={(value: number, _name: string, props: { payload?: { valueBrl?: number } }) => {
                          const brl = props.payload?.valueBrl ?? value;
                          return [`$ ${value.toFixed(2)} (R$ ${brl.toFixed(2)})`, 'Custo'];
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={apiKeyChartData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `$ ${v.toFixed(0)}`} stroke="#525252" fontSize={11} />
                      <YAxis type="category" dataKey="name" width={120} stroke="#a3a3a3" fontSize={12} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1c1c1e', 
                          border: '1px solid #2a2a2a', 
                          borderRadius: '8px',
                          color: '#e5e5e5'
                        }}
                        formatter={(value: number, _name: string, props: { payload?: { valueBrl?: number } }) => {
                          const brl = props.payload?.valueBrl ?? value;
                          return [`$ ${value.toFixed(2)} (R$ ${brl.toFixed(2)})`, 'Custo'];
                        }} 
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
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

        {tokenMetrics && tokenMetrics.totalTokens > 0 && (
          <section className="mb-8">
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Métricas de Tokens</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1c1c1e] border border-[#2a2a2a] rounded-xl p-5">
                  <p className="text-sm text-gray-400 mb-2">Prompt Tokens</p>
                  <p className="text-2xl font-semibold text-blue-400">{tokenMetrics.totalPromptTokens.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{tokenMetrics.promptPercent.toFixed(1)}%</p>
                </div>
                <div className="bg-[#1c1c1e] border border-[#2a2a2a] rounded-xl p-5">
                  <p className="text-sm text-gray-400 mb-2">Completion Tokens</p>
                  <p className="text-2xl font-semibold text-green-400">{tokenMetrics.totalCompletionTokens.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{tokenMetrics.completionPercent.toFixed(1)}%</p>
                </div>
                <div className="bg-[#1c1c1e] border border-[#2a2a2a] rounded-xl p-5">
                  <p className="text-sm text-gray-400 mb-2">Reasoning Tokens</p>
                  <p className="text-2xl font-semibold text-purple-400">{tokenMetrics.totalReasoningTokens.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Chain-of-thought</p>
                </div>
                <div className="bg-[#1c1c1e] border border-[#2a2a2a] rounded-xl p-5">
                  <p className="text-sm text-gray-400 mb-2">Cached Tokens</p>
                  <p className="text-2xl font-semibold text-amber-400">{tokenMetrics.totalCachedTokens.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{tokenMetrics.cachedPercent.toFixed(1)}% reutilizados</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#2a2a2a] flex items-center">
                <p className="text-sm text-gray-400 mr-2">Total:</p>
                <p className="text-xl font-semibold text-white">{tokenMetrics.totalTokens.toLocaleString()} tokens</p>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8">
          <SpendByModelChart data={modelMetrics} loading={modelMetricsLoading} />
        </section>
        
        <section className="mb-8">
          <InsightCard insights={insights} loading={insightsLoading} />
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Detalhes por Modelo</h2>
          <ModelCostTable data={modelMetrics} loading={modelMetricsLoading} />
        </section>
        
        <footer className="text-center text-sm text-gray-500 py-8 border-t border-[#2a2a2a]">
          <p className="text-gray-400">OpenRouter Cost Dashboard - Análise seus gastos com IA</p>
          <p className="mt-1 text-gray-500">Cotação USD/BRL: R$ {summary?.exchangeRate.toFixed(4) || '5.00'} ({summary?.exchangeRateSource || 'Automática'})</p>
        </footer>
      </main>
    </div>
  );
}

function App() { return (<QueryClientProvider client={queryClient}><Dashboard /></QueryClientProvider>); }
export default App;
