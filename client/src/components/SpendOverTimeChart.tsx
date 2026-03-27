import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { TimeSeriesData } from '../types';

interface SpendOverTimeChartProps {
  data: TimeSeriesData | undefined;
  loading: boolean;
  currency: 'USD' | 'BRL';
}

export function SpendOverTimeChart({ data, loading, currency }: SpendOverTimeChartProps) {
  if (loading) {
    return (
      <div className="chart-container">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data?.daily.length) {
    return (
      <div className="chart-container">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Gasto ao Longo do Tempo</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Nenhum dado disponível para o período selecionado
        </div>
      </div>
    );
  }

  const chartData = data.daily.map((day) => ({
    date: formatDate(day.date, 'DD/MM'),
    fullDate: formatDate(day.date, 'DD/MM/YYYY'),
    USD: parseFloat(day.totalCostUsd.toFixed(4)),
    BRL: parseFloat(day.totalCostBrl.toFixed(2)),
    Requests: day.totalRequests,
    Tokens: day.totalTokens,
  }));

  const totalCost = currency === 'USD' 
    ? chartData.reduce((sum, d) => sum + d.USD, 0)
    : chartData.reduce((sum, d) => sum + d.BRL, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { fullDate: string; Requests: number; Tokens: number } }> }) => {
    if (active && payload && payload.length) {
      const chartPayload = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{chartPayload.payload.fullDate}</p>
          <p className="text-primary-600">
            {currency === 'USD' ? 'USD' : 'BRL'}: {formatCurrency(chartPayload.value, currency)}
          </p>
          <p className="text-gray-500 text-sm">
            Requests: {chartPayload.payload.Requests.toLocaleString()}
          </p>
          <p className="text-gray-500 text-sm">
            Tokens: {chartPayload.payload.Tokens.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Gasto ao Longo do Tempo</h3>
        <div className="text-sm text-gray-500">
          Total: <span className="font-semibold text-primary-600">{formatCurrency(totalCost, currency)}</span>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
            tickFormatter={(value) => currency === 'USD' ? `$${value.toFixed(2)}` : `R$${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={currency}
            stroke="#0ea5e9"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCost)"
            name={`Gasto (${currency})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
