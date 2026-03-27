import { AlertTriangle, Info, AlertCircle, Lightbulb } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import type { Insight } from '../types';

interface InsightCardProps {
  insights: Insight[] | undefined;
  loading: boolean;
}

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
};

const colorMap = {
  info: 'bg-blue-50 border-blue-500 text-blue-800',
  warning: 'bg-amber-50 border-amber-500 text-amber-800',
  danger: 'bg-red-50 border-red-500 text-red-800',
};

const priorityBadgeMap = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
};

export function InsightCard({ insights, loading }: InsightCardProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!insights?.length) {
    return (
      <div className="card text-center py-8">
        <Lightbulb className="mx-auto text-gray-300 mb-3" size={40} />
        <p className="text-gray-500">Nenhum insight disponível para o período</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
        <Lightbulb className="text-amber-500" size={20} />
        Insights e Oportunidades
      </h3>
      
      {insights.map((insight) => {
        const Icon = iconMap[insight.type];
        const colorClass = colorMap[insight.type];
        const priorityBadge = priorityBadgeMap[insight.priority];

        return (
          <div
            key={insight.id}
            className={`border-l-4 rounded-r-lg p-4 ${colorClass}`}
          >
            <div className="flex items-start gap-3">
              <Icon className="flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{insight.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityBadge}`}>
                    {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                </div>
                <p className="text-sm opacity-90">{insight.description}</p>
                
                {insight.potentialSavings && (
                  <div className="mt-2 p-2 bg-white/50 rounded-lg">
                    <p className="text-sm font-medium">
                      Economia potencial: {formatCurrency(insight.potentialSavings.usd, 'USD')} / {formatCurrency(insight.potentialSavings.brl, 'BRL')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
