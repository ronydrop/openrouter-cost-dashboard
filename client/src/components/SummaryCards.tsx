import { formatCurrency, formatNumber } from '../utils/formatters';
import type { DashboardSummary } from '../types';

interface SummaryCardsProps {
  data: DashboardSummary | undefined;
  loading: boolean;
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        Nenhum dado disponível
      </div>
    );
  }

  const usedPercent = data.totalCredits > 0
    ? ((data.usedCredits / data.totalCredits) * 100).toFixed(1)
    : '0';

  const remainingPercent = data.totalCredits > 0
    ? ((data.remainingCredits / data.totalCredits) * 100).toFixed(1)
    : '0';

  const remainingBrl = (data.remainingCredits * data.exchangeRate).toFixed(2);
  const isCritical = parseFloat(remainingPercent) < 10;
  const isWarning = parseFloat(remainingPercent) < 25;

  const latestLabel = data.latestDataDate
    ? `Último dado: ${new Date(data.latestDataDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}`
    : 'Último dia disponível';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl shadow-sm border-2 p-5 ${
          isCritical
            ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 dark:border-red-600'
            : isWarning
            ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-800/30 dark:border-yellow-600'
            : 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-800/30 dark:border-green-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Saldo Disponível</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isCritical ? 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200' :
              isWarning  ? 'bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200' :
                           'bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200'
            }`}>
              {remainingPercent}% restante
            </span>
          </div>
          <p className={`text-3xl font-bold mt-1 ${
            isCritical ? 'text-red-700 dark:text-red-300' : isWarning ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'
          }`}>
            {formatCurrency(data.remainingCredits, 'USD')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">≈ R$ {remainingBrl}</p>
          <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(parseFloat(remainingPercent), 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatCurrency(data.usedCredits, 'USD')} usados de {formatCurrency(data.totalCredits, 'USD')} ({usedPercent}%)
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Último dia disponível
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              {latestLabel.replace('Último dado: ', '')}
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(data.todayCostUsd, 'USD')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatCurrency(data.todayCostBrl, 'BRL')}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Dados OpenRouter têm 1 dia de defasagem
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cotação USD/BRL</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              data.exchangeRateMode === 'auto'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
            }`}>
              {data.exchangeRateMode === 'auto' ? 'Automática' : 'Manual'}
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            R$ {data.exchangeRate.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.exchangeRateSource}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Últimos 7 dias</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(data.last7DaysCostUsd, 'USD')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatCurrency(data.last7DaysCostBrl, 'BRL')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Últimos 30 dias</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(data.last30DaysCostUsd, 'USD')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatCurrency(data.last30DaysCostBrl, 'BRL')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Média Diária</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(data.avgDailyCostUsd, 'USD')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatCurrency(data.avgDailyCostBrl, 'BRL')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatNumber(data.totalRequests)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatNumber(data.totalTokens)} tokens • {formatCurrency(data.avgCostPerRequest, 'USD')}/req
          </p>
        </div>
      </div>
    </div>
  );
}
