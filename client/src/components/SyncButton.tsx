import { format } from '../utils/formatters';

interface SyncButtonProps {
  onSync: () => void;
  isSyncing: boolean;
  hasData: boolean;
  error?: string | null;
  lastSync?: string;
}

export function SyncButton({ onSync, isSyncing, hasData, error, lastSync }: SyncButtonProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isSyncing
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSyncing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sincronizando...
              </span>
            ) : (
              'Sincronizar Dados'
            )}
          </button>
          
          <div className="text-sm text-gray-600">
            {hasData ? (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {lastSync ? `Última sync: ${format(new Date(lastSync), 'dd/MM/yyyy HH:mm')}` : 'Dados disponíveis'}
              </span>
            ) : (
              <span className="flex items-center text-orange-600">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Nenhum dado sincronizado
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
