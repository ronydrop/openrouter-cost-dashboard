import { AlertTriangle, Info, AlertCircle, Lightbulb, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Insight } from '../types';

interface InsightCardProps {
  insights: Insight[] | undefined;
  loading: boolean;
}

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
  'model_concentration': Target,
  'trend_change': TrendingUp,
  'peak_day': TrendingDown,
};

const colorMap = {
  info: 'bg-blue-50 border-blue-500 text-blue-800',
  warning: 'bg-amber-50 border-amber-500 text-amber-800',
  critical: 'bg-red-50 border-red-500 text-red-800',
};

const severityBadgeMap = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

export function InsightCard({ insights, loading }: InsightCardProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
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
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Lightbulb className="mx-auto text-gray-300 mb-3" size={40} />
        <p className="text-gray-500">Nenhum insight disponível para o período</p>
        <p className="text-sm text-gray-400 mt-2">Sincronize os dados para gerar insights</p>
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
        const Icon = iconMap[insight.severity] || Info;
        const colorClass = colorMap[insight.severity] || colorMap.info;
        const severityBadge = severityBadgeMap[insight.severity] || severityBadgeMap.info;

        return (
          <div
            key={insight.id}
            className={`bg-white rounded-lg shadow border-l-4 p-4 ${colorClass}`}
          >
            <div className="flex items-start gap-3">
              <Icon className="flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{insight.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${severityBadge}`}>
                    {insight.severity === 'critical' ? 'Crítico' : insight.severity === 'warning' ? 'Atenção' : 'Info'}
                  </span>
                </div>
                <p className="text-sm opacity-90">{insight.description}</p>
                
                {insight.meta && Object.keys(insight.meta).length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                    {insight.meta.percentage !== undefined && (
                      <span>{(insight.meta.percentage * 100).toFixed(1)}% do total</span>
                    )}
                    {insight.meta.changePercent !== undefined && (
                      <span className={insight.meta.changePercent > 0 ? 'text-red-600' : 'text-green-600'}>
                        {insight.meta.changePercent > 0 ? '+' : ''}{insight.meta.changePercent.toFixed(1)}%
                      </span>
                    )}
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
