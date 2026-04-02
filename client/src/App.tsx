import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardHeader, SummaryCards, SpendOverTimeChart, SpendByModelChart, ModelCostTable, SyncButton } from './components';
import { useDashboardSummary, useTimeSeries, useModelMetrics, useSyncData, useProviderMetrics, useApiKeyMetrics, useApiKeyTimeSeries, useTokenMetrics } from './hooks/useDashboard';
import { useAutoSync } from './hooks/useAutoSync';
import { apiService } from './services/api';
import type { DateRange, ApiKeyTimeSeriesPoint } from './types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

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
  const { data: providerMetricsResponse, isLoading: providerLoading } = useProviderMetrics(rangeToUse);
  const { data: apiKeyMetricsResponse, isLoading: apiKeyLoading } = useApiKeyMetrics(rangeToUse);
  const { data: apiKeyTimeSeriesResponse, isLoading: apiKeyTimeSeriesLoading } = useApiKeyTimeSeries(rangeToUse);
  const { data: tokenMetricsResponse } = useTokenMetrics(rangeToUse);

  const summary = summaryResponse?.data;
  const timeSeries = timeSeriesResponse?.data;
  const modelMetrics = modelMetricsResponse?.data;
  const providerMetrics = providerMetricsResponse?.data;
  const apiKeyMetrics = apiKeyMetricsResponse?.data;
  const apiKeyTimeSeries = apiKeyTimeSeriesResponse?.data || [];
  const apiKeyTimeSeriesCoverage = apiKeyTimeSeriesResponse?.coverage;
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

  const apiKeySeriesKeys = apiKeyTimeSeries.length > 0
    ? Object.keys(apiKeyTimeSeries[0]).filter((key) => key !== 'date' && !key.endsWith('__brl'))
    : [];

  const apiKeySeriesColors = apiKeySeriesKeys.reduce<Record<string, string>>((acc, key, index) => {
    acc[key] = COLORS[index % COLORS.length];
    return acc;
  }, {});

  const apiKeyDailyTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string | number; value?: number; payload?: ApiKeyTimeSeriesPoint }>; label?: string }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-[#1c1c1e] border border-[#3a3a3a] rounded-xl p-4 shadow-2xl min-w-[240px]" style={{ color: '#f8fafc' }}>
        <p className="text-sm font-semibold text-white mb-3">{label}</p>
        <div className="space-y-2">
          {payload
            .filter((entry) => typeof entry.value === 'number' && entry.value! > 0)
            .sort((a, b) => (Number(b.value) - Number(a.value)))
            .map((entry) => {
              const key = String(entry.dataKey || '');
              const brl = Number(entry.payload?.[`${key}__brl`] || 0);
              return (
                <div key={key} className="flex items-start justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: apiKeySeriesColors[key] }} />
                    <span className="text-slate-300 truncate">{key}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">$ {Number(entry.value).toFixed(2)}</div>
                    <div className="text-slate-400">R$ {brl.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  const formatCoverageDate = (date: string | null | undefined) => {
    if (!date) return '--/--';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T12:00:00`));
  };

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
              <div className="space-y-8">
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

                <div className="bg-[#1c1c1e] border border-[#2a2a2a] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-white">Gasto diário por API Key</h4>
                    <span className="text-xs text-gray-400">Top chaves do período</span>
                  </div>
                  {apiKeyTimeSeriesCoverage?.isDelayed && apiKeyTimeSeries.length > 0 && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                      <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-400" size={16} />
                      <div>
                        <p className="text-sm font-medium text-amber-200">
                          Dados por API key ainda não contabilizados nos dias mais recentes
                        </p>
                        <p className="mt-1 text-xs text-amber-100/80">
                          Último dia com atribuição por key: {formatCoverageDate(apiKeyTimeSeriesCoverage.latestAvailableDate)}.
                          {' '}O dashboard geral já possui dados até {formatCoverageDate(apiKeyTimeSeriesCoverage.latestDashboardDate)}.
                        </p>
                      </div>
                    </div>
                  )}
                  {apiKeyTimeSeriesLoading ? (
                    <div className="h-80 bg-[#161616] animate-pulse rounded-xl"></div>
                  ) : apiKeyTimeSeries.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={apiKeyTimeSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis dataKey="date" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#737373" fontSize={11} tickFormatter={(v) => `$ ${Number(v).toFixed(0)}`} tickLine={false} axisLine={false} />
                          <Tooltip content={apiKeyDailyTooltip} />
                          <Legend wrapperStyle={{ color: '#d4d4d8', fontSize: '12px' }} />
                          {apiKeySeriesKeys.map((key) => (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={key}
                              stroke={apiKeySeriesColors[key]}
                              strokeWidth={2}
                              dot={{ r: 2 }}
                              activeDot={{ r: 4 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">Sem série diária disponível</div>
                  )}
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
