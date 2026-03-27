import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { formatCurrency, formatCurrencyBrl, formatPercent } from '../utils/formatters';
import type { ModelMetrics } from '../types';

interface SpendByModelChartProps {
  data: ModelMetrics[] | undefined;
  loading: boolean;
}

const COLORS = [
  '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#06b6d4',
];

export function SpendByModelChart({ data, loading }: SpendByModelChartProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Gasto por Modelo</h3>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Nenhum dado disponível
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Distribuição por Modelo</h3>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Nenhum dado disponível
          </div>
        </div>
      </div>
    );
  }

  const topModels = [...data]
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
    .slice(0, 10);

  const barData = topModels.map((model) => ({
    name: model.model.length > 20 ? model.model.substring(0, 20) + '...' : model.model,
    fullName: model.model,
    value: parseFloat(model.totalCostUsd.toFixed(2)),
    valueBrl: parseFloat(model.totalCostBrl.toFixed(2)),
    percent: model.percentOfTotal,
  }));

  const pieData = topModels.map((model) => ({
    name: model.model.length > 15 ? model.model.substring(0, 15) + '...' : model.model,
    fullName: model.model,
    value: model.totalCostUsd,
    valueBrl: model.totalCostBrl,
    percent: model.percentOfTotal,
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName: string; value: number; valueBrl: number; percent: number } }> }) => {
    if (active && payload && payload.length) {
      const chartData = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 dark:text-white mb-1">{chartData.fullName}</p>
          <p className="text-primary-600 dark:text-primary-400">
            {formatCurrency(chartData.value)} ({formatCurrencyBrl(chartData.valueBrl)})
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Participação: {formatPercent(chartData.percent)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Gasto por Modelo (Top 10)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
            <XAxis 
              type="number" 
              stroke="#9ca3af"
              fontSize={11}
              tickFormatter={(value) => `$ ${value.toFixed(2)}`}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#9ca3af"
              fontSize={10}
              width={100}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {barData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Distribuição por Modelo</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
              wrapperStyle={{ fontSize: 10 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
