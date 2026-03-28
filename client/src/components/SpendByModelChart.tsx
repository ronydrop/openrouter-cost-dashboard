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
} from 'recharts';
import { formatCurrency, formatCurrencyBrl, formatPercent } from '../utils/formatters';
import type { ModelMetrics } from '../types';

interface SpendByModelChartProps {
  data: ModelMetrics[] | undefined;
  loading: boolean;
}

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
];

export function SpendByModelChart({ data, loading }: SpendByModelChartProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-[#1c1c1e] rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-[#1c1c1e] rounded-xl"></div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-[#1c1c1e] rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-[#1c1c1e] rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Gasto por Modelo</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Nenhum dado disponível
          </div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Modelo</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
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
        <div className="bg-[#1c1c1e] p-4 border border-[#3a3a3a] rounded-xl shadow-2xl min-w-[200px]">
          <p className="font-semibold text-white text-sm mb-3 truncate max-w-[250px]">{chartData.fullName}</p>
          <div className="space-y-2">
            <div>
              <p className="text-gray-400 text-xs mb-1">Custo</p>
              <p className="text-white font-semibold">{formatCurrency(chartData.value)}</p>
              <p className="text-gray-500 text-xs">{formatCurrencyBrl(chartData.valueBrl)}</p>
            </div>
            <div className="pt-2 border-t border-[#2a2a2a]">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Participação:</span>
                <span className="text-gray-300">{formatPercent(chartData.percent)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Gasto por Modelo (Top 10)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
            <XAxis 
              type="number" 
              stroke="#525252"
              fontSize={11}
              tickFormatter={(value) => `$ ${value.toFixed(0)}`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#a3a3a3"
              fontSize={11}
              width={100}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {barData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Distribuição por Modelo</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
