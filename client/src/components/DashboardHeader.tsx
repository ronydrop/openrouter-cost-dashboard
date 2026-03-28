import { Activity, Sun, Moon } from 'lucide-react';
import { useHealthCheck } from '../hooks/useDashboard';
import { useTheme } from '../hooks/useTheme';

export function DashboardHeader() {
  const { data: health } = useHealthCheck();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-[#161616] border-b border-gray-200 dark:border-[#2a2a2a] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 dark:from-[#3b82f6] dark:to-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="text-white" size={22} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">OpenRouter Cost Dashboard</h1>
                <p className="text-sm text-slate-500 dark:text-gray-400">Análise de gastos com IA</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-slate-100 dark:bg-[#1c1c1e] rounded-full border border-slate-200 dark:border-[#2a2a2a]">
              {health?.status === 'ok' ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-gray-300">API OK</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-gray-300">Erro API</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#262628] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 border border-slate-200 dark:border-[#2a2a2a] cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="text-amber-500" size={20} />
            ) : (
              <Moon className="text-slate-600" size={20} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
