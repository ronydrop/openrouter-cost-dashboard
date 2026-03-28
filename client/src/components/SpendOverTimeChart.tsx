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
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-[#1c1c1e] rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-[#1c1c1e] rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data?.daily.length) {
    return (
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Gasto ao Longo do Tempo</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
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
        <div className="bg-[#1c1c1e] p-4 border border-[#3a3a3a] rounded-xl shadow-2xl min-w-[180px]">
          <p className="font-semibold text-white text-sm mb-3">{chartPayload.payload.fullDate}</p>
          <div className="space-y-2">
            <div>
              <p className="text-gray-400 text-xs mb-1">Custo</p>
              <p className="text-white font-semibold">{formatCurrency(chartPayload.payload.USD)}</p>
              <p className="text-gray-500 text-xs">{formatCurrencyBrl(chartPayload.payload.BRL)}</p>
            </div>
            <div className="pt-2 border-t border-[#2a2a2a]">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Requests:</span>
                <span className="text-gray-300">{chartPayload.payload.Requests.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">Tokens:</span>
                <span className="text-gray-300">{chartPayload.payload.Tokens.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Gasto ao Longo do Tempo</h3>
        <div className="text-sm text-gray-400">
          Total: <span className="font-semibold text-[#3b82f6]">{formatCurrency(totalCostUsd)} ({formatCurrencyBrl(totalCostBrl)})</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#525252"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#525252"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$ ${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="USD"
            stroke="#3b82f6"
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
