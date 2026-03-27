import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatCurrency, formatCurrencyBrl, formatDate } from '../utils/formatters';
import type { TimeSeriesData } from '../types';

interface SpendOverTimeChartProps {
  data: TimeSeriesData | undefined;
  loading: boolean;
}

export function SpendOverTimeChart({ data, loading }: SpendOverTimeChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data?.daily.length) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Gasto ao Longo do Tempo</h3>
        <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Nenhum dado disponível para o período selecionado
        </div>
      </div>
    );
  }

  const chartData = data.daily.map((day) => ({
    date: formatDate(day.date, 'DD/MM'),
    fullDate: formatDate(day.date, 'DD/MM/YYYY'),
    USD: parseFloat(day.totalCostUsd.toFixed(2)),
    BRL: parseFloat(day.totalCostBrl.toFixed(2)),
    Requests: day.totalRequests,
    Tokens: day.totalTokens,
  }));

  const totalCostUsd = chartData.reduce((sum, d) => sum + d.USD, 0);
  const totalCostBrl = chartData.reduce((sum, d) => sum + d.BRL, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { fullDate: string; USD: number; BRL: number; Requests: number; Tokens: number } }> }) => {
    if (active && payload && payload.length) {
      const chartPayload = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 dark:text-white">{chartPayload.payload.fullDate}</p>
          <p className="text-primary-600 dark:text-primary-400">
            {formatCurrency(chartPayload.payload.USD)} ({formatCurrencyBrl(chartPayload.payload.BRL)})
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Requests: {chartPayload.payload.Requests.toLocaleString()}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Tokens: {chartPayload.payload.Tokens.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Gasto ao Longo do Tempo</h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: <span className="font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(totalCostUsd)} ({formatCurrencyBrl(totalCostBrl)})</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `$ ${value.toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="USD"
            stroke="#0ea5e9"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCost)"
            name="Gasto (USD)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
