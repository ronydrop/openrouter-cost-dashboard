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
          <div key={i} className="stat-card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 py-8">
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

  // "Hoje" no OpenRouter = último dia disponível (dados chegam com 1 dia de delay)
  const latestLabel = data.latestDataDate
    ? `Último dado: ${new Date(data.latestDataDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}`
    : 'Último dia disponível';

  return (
    <div className="space-y-4">
      {/* Row 1: Créditos em destaque */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card saldo — destaque principal */}
        <div className={`stat-card border-2 ${
          isCritical
            ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100'
            : isWarning
            ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50'
            : 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Saldo Disponível</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isCritical ? 'bg-red-200 text-red-700' :
              isWarning  ? 'bg-yellow-200 text-yellow-700' :
                           'bg-green-200 text-green-700'
            }`}>
              {remainingPercent}% restante
            </span>
          </div>
          <p className={`text-3xl font-bold mt-1 ${
            isCritical ? 'text-red-700' : isWarning ? 'text-yellow-700' : 'text-green-700'
          }`}>
            {formatCurrency(data.remainingCredits, 'USD')}
          </p>
          <p className="text-sm text-gray-500 mt-1">≈ R$ {remainingBrl}</p>
          {/* Barra de progresso */}
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(parseFloat(remainingPercent), 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {formatCurrency(data.usedCredits, 'USD')} usados de {formatCurrency(data.totalCredits, 'USD')} ({usedPercent}%)
          </p>
        </div>

        {/* Card gasto no último dia disponível */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Último dia disponível
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {latestLabel.replace('Último dado: ', '')}
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(data.todayCostUsd, 'USD')}
          </p>
          <p className="text-sm text-gray-500 mt-1">{formatCurrency(data.todayCostBrl, 'BRL')}</p>
          <p className="text-xs text-gray-400 mt-2">
            Dados OpenRouter têm 1 dia de defasagem
          </p>
        </div>

        {/* Cotação */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cotação USD/BRL</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              data.exchangeRateMode === 'auto'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {data.exchangeRateMode === 'auto' ? 'Automática' : 'Manual'}
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            R$ {data.exchangeRate.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{data.exchangeRateSource}</p>
        </div>
      </div>

      {/* Row 2: Métricas de custo */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-card-label">Últimos 7 dias</p>
          <p className="stat-card-value">{formatCurrency(data.last7DaysCostUsd, 'USD')}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(data.last7DaysCostBrl, 'BRL')}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Últimos 30 dias</p>
          <p className="stat-card-value">{formatCurrency(data.last30DaysCostUsd, 'USD')}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(data.last30DaysCostBrl, 'BRL')}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Média Diária</p>
          <p className="stat-card-value">{formatCurrency(data.avgDailyCostUsd, 'USD')}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(data.avgDailyCostBrl, 'BRL')}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Total Requests</p>
          <p className="stat-card-value">{formatNumber(data.totalRequests)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatNumber(data.totalTokens)} tokens • {formatCurrency(data.avgCostPerRequest, 'USD')}/req
          </p>
        </div>
      </div>
    </div>
  );
}
