import { DateRangeFilter } from './DateRangeFilter';
import type { DateRange } from '../types';
import { RefreshCw, AlertCircle, Zap, ZapOff } from 'lucide-react';

interface SyncButtonProps {
  onSync: () => void;
  isSyncing: boolean;
  hasData: boolean;
  error?: string | null;
  lastSync?: string | null;
  nextSync?: string | null;
  isInitialSync?: boolean;
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: () => void;
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  customDateRange?: { start: string; end: string };
  onCustomDateRangeChange?: (range: { start: string; end: string }) => void;
}

export function SyncButton({ 
  onSync, 
  isSyncing, 
  hasData, 
  error, 
  lastSync,
  nextSync,
  isInitialSync,
  autoSyncEnabled = true,
  onToggleAutoSync,
  selectedRange,
  onRangeChange,
  customDateRange,
  onCustomDateRangeChange
}: SyncButtonProps) {
  const getTimeSinceLastSync = () => {
    if (!lastSync) return null;
    const diff = Date.now() - new Date(lastSync).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const getNextSyncText = () => {
    if (!nextSync) return null;
    const diff = new Date(nextSync).getTime() - Date.now();
    if (diff <= 0) return 'em breve';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `em ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `em ${hours}h`;
  };

  return (
    <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
              isSyncing
                ? 'bg-gray-100 dark:bg-[#1c1c1e] text-gray-400 cursor-not-allowed border border-gray-200 dark:border-[#2a2a2a]'
                : 'bg-blue-500 dark:bg-[#3b82f6] hover:bg-blue-600 dark:hover:bg-[#2563eb] text-white shadow-lg shadow-blue-500/25'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                <span>Sincronizar</span>
              </>
            )}
          </button>
          
          <div className="flex items-center gap-2">
            {hasData ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-500/10 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600 dark:text-green-400">
                  {lastSync ? `${getTimeSinceLastSync()}` : 'Dados disponíveis'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-500/10 rounded-full">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-amber-600 dark:text-amber-400">Sem dados</span>
              </div>
            )}
          </div>

          {isInitialSync && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-500/10 rounded-full">
              <RefreshCw className="animate-spin" size={14} />
              <span className="text-sm text-blue-600 dark:text-blue-400">Sincronizando...</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            {autoSyncEnabled ? (
              <button
                onClick={onToggleAutoSync}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 dark:bg-green-500/10 hover:bg-green-200 dark:hover:bg-green-500/20 rounded-lg transition-colors"
                title="Sincronização automática ativa"
              >
                <Zap size={14} className="text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-600 dark:text-green-400">Auto</span>
                {nextSync && (
                  <span className="text-xs text-green-600/70 dark:text-green-400/70">({getNextSyncText()})</span>
                )}
              </button>
            ) : (
              <button
                onClick={onToggleAutoSync}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-500/10 hover:bg-gray-200 dark:hover:bg-gray-500/20 rounded-lg transition-colors"
                title="Sincronização automática desativada"
              >
                <ZapOff size={14} className="text-slate-400 dark:text-gray-400" />
                <span className="text-xs text-slate-400 dark:text-gray-400">Manual</span>
              </button>
            )}
          </div>

          <DateRangeFilter
            selectedRange={selectedRange}
            onRangeChange={onRangeChange}
            customDateRange={customDateRange}
            onCustomDateRangeChange={onCustomDateRangeChange}
          />
          
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl border border-red-200 dark:border-red-500/20">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}