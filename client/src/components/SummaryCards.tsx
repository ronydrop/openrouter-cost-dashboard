import { formatNumber, formatCurrencyBrl } from '../utils/formatters';
import type { DashboardSummary } from '../types';

const formatUsd = (value: number): string => {
  const v = typeof value === 'number' && isFinite(value) ? value : 0;
  return `$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
};

interface SummaryCardsProps {
  data: DashboardSummary | undefined;
  loading: boolean;
}

const formatReferenceDate = (date?: string): string => {
  if (!date) return '--/--';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T12:00:00`));
};

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-100 dark:bg-[#1c1c1e] rounded w-1/2 mb-4"></div>
            <div className="h-10 bg-gray-100 dark:bg-[#1c1c1e] rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-slate-500 dark:text-gray-500 py-12">
        Nenhum dado disponível
      </div>
    );
  }

  const remainingPercent = data.totalCredits > 0
    ? ((data.remainingCredits / data.totalCredits) * 100).toFixed(1)
    : '0';

  const isCritical = parseFloat(remainingPercent) < 10;
  const isWarning = parseFloat(remainingPercent) < 25;

  const latestReferenceDate = data.latestDataDate;
  const previousReferenceDate = latestReferenceDate
    ? new Date(new Date(`${latestReferenceDate}T12:00:00`).getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 md:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500 dark:text-gray-400 font-medium">Gastos Hoje</span>
          <span className="text-xs text-slate-500 dark:text-gray-500 bg-gray-100 dark:bg-[#1c1c1e] px-2.5 py-1 rounded-full border border-gray-200 dark:border-[#2a2a2a]">
            {formatReferenceDate(latestReferenceDate)}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatUsd(data.todayCostUsd)}
          </span>
          <span className="text-sm text-slate-500 dark:text-gray-400">
            ({formatCurrencyBrl(data.todayCostBrl)})
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-gray-500">Último dia disponível na API</p>
      </div>

      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 md:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500 dark:text-gray-400 font-medium">Gastos Ontem</span>
          <span className="text-xs text-slate-500 dark:text-gray-500 bg-gray-100 dark:bg-[#1c1c1e] px-2.5 py-1 rounded-full border border-gray-200 dark:border-[#2a2a2a]">
            {formatReferenceDate(previousReferenceDate)}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatUsd(data.yesterdayCostUsd)}
          </span>
          <span className="text-sm text-slate-500 dark:text-gray-400">
            ({formatCurrencyBrl(data.yesterdayCostBrl)})
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-gray-500">Comparativo do dia anterior</p>
      </div>

      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-6 md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500 dark:text-gray-400 font-medium">Saldo Disponível</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isCritical ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
            isWarning  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                            'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
          }`}>
            {remainingPercent}% restante
          </span>
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold tracking-tight ${
                isCritical ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {formatUsd(data.remainingCredits)}
              </span>
              <span className="text-lg text-slate-500 dark:text-gray-400">
                ({formatCurrencyBrl(data.remainingCredits * data.exchangeRate)})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-500 mt-2">
              Saldo convertido pela cotação atual do dashboard
            </p>
          </div>

          <div className="lg:min-w-[220px] lg:border-l lg:border-gray-200 lg:dark:border-[#2a2a2a] lg:pl-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-gray-400 font-medium">Cotação USD/BRL</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                data.exchangeRateMode === 'auto'
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
              }`}>
                {data.exchangeRateMode === 'auto' ? 'Automática' : 'Manual'}
              </span>
            </div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mb-1">
              R$ {data.exchangeRate.toFixed(2)}
            </p>
            <p className="text-sm text-slate-500 dark:text-gray-500">{data.exchangeRateSource}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-2">Últimos 7 dias</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white">{formatUsd(data.last7DaysCostUsd)}</span>
            <span className="text-sm text-slate-500 dark:text-gray-400">({formatCurrencyBrl(data.last7DaysCostBrl)})</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-2">Últimos 30 dias</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white">{formatUsd(data.last30DaysCostUsd)}</span>
            <span className="text-sm text-slate-500 dark:text-gray-400">({formatCurrencyBrl(data.last30DaysCostBrl)})</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-2">Média Diária</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white">{formatUsd(data.avgDailyCostUsd)}</span>
            <span className="text-sm text-slate-500 dark:text-gray-400">({formatCurrencyBrl(data.avgDailyCostBrl)})</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-2">Total Requests</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{formatNumber(data.totalRequests)}</p>
          <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">
            {formatNumber(data.totalTokens)} tokens
          </p>
        </div>
      </div>
    </div>
  );
}
