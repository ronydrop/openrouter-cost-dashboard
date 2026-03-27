import { Activity, AlertCircle, CheckCircle, Sun, Moon } from 'lucide-react';
import { useHealthCheck } from '../hooks/useDashboard';
import { useTheme } from '../hooks/useTheme';

export function DashboardHeader() {
  const { data: health } = useHealthCheck();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white border-b border-gray-200 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">OpenRouter Cost Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Análise de gastos com IA</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {health?.status === 'ok' ? (
                <>
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-xs text-green-600 font-medium dark:text-green-400">API OK</span>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-500" size={16} />
                  <span className="text-xs text-red-600 font-medium dark:text-red-400">Erro API</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="text-yellow-500" size={20} />
            ) : (
              <Moon className="text-gray-600" size={20} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
