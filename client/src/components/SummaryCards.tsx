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

  // Calcular saldo restante em vez de mostrar usado
  const remainingCreditsBrl = data.remainingCredits * data.exchangeRate;
  const usedCreditsPercent = data.totalCredits > 0 
    ? (data.usedCredits / data.totalCredits * 100).toFixed(1) 
    : '0';

  const cards = [
    {
      label: 'Créditos Totais',
      value: formatCurrency(data.totalCredits, 'USD'),
      subValue: `Saldo: ${formatCurrency(data.remainingCredits, 'USD')} (${remainingCreditsBrl.toFixed(2)} BRL)`,
      icon: '💰',
      highlight: true,
    },
    {
      label: 'Créditos Usados',
      value: formatCurrency(data.usedCredits, 'USD'),
      subValue: `${usedCreditsPercent}% do total`,
      icon: '💸',
      highlight: false,
    },
    {
      label: 'Cotação USD/BRL',
      value: `R$ ${data.exchangeRate.toFixed(4)}`,
      subValue: `${data.exchangeRateMode === 'auto' ? 'Automática' : 'Manual'} • ${data.exchangeRateSource}`,
      icon: '💱',
      highlight: false,
    },
    {
      label: 'Gasto Hoje',
      value: formatCurrency(data.todayCostUsd, 'USD'),
      subValue: formatCurrency(data.todayCostBrl, 'BRL'),
      icon: '📅',
      highlight: false,
    },
    {
      label: 'Últimos 7 dias',
      value: formatCurrency(data.last7DaysCostUsd, 'USD'),
      subValue: formatCurrency(data.last7DaysCostBrl, 'BRL'),
      icon: '📊',
      highlight: false,
    },
    {
      label: 'Últimos 30 dias',
      value: formatCurrency(data.last30DaysCostUsd, 'USD'),
      subValue: formatCurrency(data.last30DaysCostBrl, 'BRL'),
      icon: '📈',
      highlight: false,
    },
    {
      label: 'Média Diária',
      value: formatCurrency(data.avgDailyCostUsd, 'USD'),
      subValue: formatCurrency(data.avgDailyCostBrl, 'BRL'),
      icon: '📉',
      highlight: false,
    },
    {
      label: 'Total Requests',
      value: formatNumber(data.totalRequests),
      subValue: `${formatNumber(data.totalTokens)} tokens`,
      icon: '🔄',
      highlight: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className={`stat-card ${card.highlight ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{card.icon}</span>
          </div>
          <div className="mt-2">
            <p className="stat-card-label">{card.label}</p>
            <p className={`stat-card-value ${card.highlight ? 'text-primary-700' : ''}`}>
              {card.value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{card.subValue}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
