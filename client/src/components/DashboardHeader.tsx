import { Activity, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useHealthCheck } from '../hooks/useDashboard';
import { DateRangeFilter } from './DateRangeFilter';
import type { DateRange } from '../types';

interface DashboardHeaderProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  customDateRange?: { start: string; end: string };
  onCustomDateRangeChange?: (range: { start: string; end: string }) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DashboardHeader({
  selectedRange,
  onRangeChange,
  customDateRange,
  onCustomDateRangeChange,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) {
  const { data: health } = useHealthCheck();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">OpenRouter Cost Dashboard</h1>
                <p className="text-sm text-gray-500">Análise de gastos com IA</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {health?.status === 'ok' ? (
                <>
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-xs text-green-600 font-medium">API OK</span>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-500" size={16} />
                  <span className="text-xs text-red-600 font-medium">Erro API</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <DateRangeFilter
              selectedRange={selectedRange}
              onRangeChange={onRangeChange}
              customDateRange={customDateRange}
              onCustomDateRangeChange={onCustomDateRangeChange}
            />
            
            <div className="flex items-center gap-3">
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
