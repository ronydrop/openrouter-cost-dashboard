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
  info: 'bg-white dark:bg-[#1c1c1e] border-l-blue-500',
  warning: 'bg-white dark:bg-[#1c1c1e] border-l-amber-500',
  critical: 'bg-white dark:bg-[#1c1c1e] border-l-red-500',
};

const badgeMap = {
  info: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  critical: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400',
};

const iconColorMap = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  critical: 'text-red-500',
};

export function InsightCard({ insights, loading }: InsightCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Insights</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-slate-100 dark:bg-[#262628] rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-100 dark:bg-[#262628] rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!insights?.length) {
    return (
      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-8 text-center">
        <Lightbulb className="mx-auto text-slate-300 dark:text-gray-600 mb-3" size={40} />
        <p className="text-slate-500 dark:text-gray-400">Nenhum insight disponível</p>
        <p className="text-sm text-slate-400 dark:text-gray-500 mt-2">Sincronize os dados para gerar insights</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Insights e Oportunidades</h3>
      </div>
      
      <div className="space-y-3">
        {insights.map((insight) => {
          const Icon = iconMap[insight.severity] || Info;
          const colorClass = colorMap[insight.severity] || colorMap.info;
          const badgeClass = badgeMap[insight.severity] || badgeMap.info;
          const iconColor = iconColorMap[insight.severity] || iconColorMap.info;

          return (
            <div
              key={insight.id}
              className={`bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#2a2a2a] border-l-4 rounded-xl p-4 ${colorClass}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`flex-shrink-0 mt-0.5 ${iconColor}`} size={18} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-slate-900 dark:text-white">{insight.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                      {insight.severity === 'critical' ? 'Crítico' : insight.severity === 'warning' ? 'Atenção' : 'Info'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-gray-400">{insight.description}</p>
                  
                  {insight.meta && Object.keys(insight.meta).length > 0 && (
                    <div className="mt-3 p-2 bg-gray-100 dark:bg-[#262628] rounded-lg text-xs">
                      {insight.meta.percentage !== undefined && (
                        <span className="text-slate-500 dark:text-gray-400">{(insight.meta.percentage * 100).toFixed(1)}% do total</span>
                      )}
                      {insight.meta.changePercent !== undefined && (
                        <span className={insight.meta.changePercent > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}>
                          {insight.meta.changePercent > 0 ? ' +' : ' '}{insight.meta.changePercent.toFixed(1)}%
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
    </div>
  );
}